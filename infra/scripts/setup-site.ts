// Creates the Vitalog hosting with plain AWS API calls: a private S3 bucket, CloudFront
// in front of it, and an IAM user GitHub deploys with. It does the same job as the CDK
// stack for accounts that don't allow CloudFormation, such as AWS free-plan accounts.
//
// Safe to run again: it finds what already exists and only creates what's missing.
//
//   pnpm --filter @vitalog/infra setup-site -- --profile vitalog
//   add --new-key to replace the deploy user's access key
import {
  CloudFrontClient,
  CreateDistributionCommand,
  CreateFunctionCommand,
  CreateOriginAccessControlCommand,
  DescribeFunctionCommand,
  ListDistributionsCommand,
  ListOriginAccessControlsCommand,
  PublishFunctionCommand,
  UpdateFunctionCommand,
  type DistributionSummary,
} from '@aws-sdk/client-cloudfront'
import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  DeleteAccessKeyCommand,
  GetUserCommand,
  IAMClient,
  ListAccessKeysCommand,
  PutUserPolicyCommand,
} from '@aws-sdk/client-iam'
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketOwnershipControlsCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { SPA_REWRITE } from '../lib/site-stack'
import { NAMES, bucketNameFor, bucketPolicy, deployPolicy, distributionConfig } from '../lib/plain-config'

const REGION = 'us-east-1'
const args = process.argv.slice(2)
const profile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : 'vitalog'
const newKey = args.includes('--new-key')

const credentials = fromIni({ profile })
const s3 = new S3Client({ region: REGION, credentials })
const cloudfront = new CloudFrontClient({ region: REGION, credentials })
const iam = new IAMClient({ region: REGION, credentials })
const sts = new STSClient({ region: REGION, credentials })

const log = (msg: string) => console.log(`  ${msg}`)
const errorName = (err: unknown) => (err as { name?: string }).name ?? ''

/** Runs one step, and turns a permission error into a message that says which step was blocked. */
async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  console.log(`• ${label}`)
  try {
    return await run()
  } catch (err) {
    const message = (err as Error).message ?? String(err)
    if (/AccessDenied|not authorized/i.test(errorName(err) + message)) {
      console.error(`\n✗ AWS refused "${label}":\n  ${message}\n`)
      console.error('  If it mentions a service control policy, this account plan blocks that service.')
    }
    throw err
  }
}

async function ensureBucket(bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }))
    log(`bucket ${bucket} already exists`)
  } catch (err) {
    if (!['NotFound', 'NoSuchBucket'].includes(errorName(err))) throw err
    await s3.send(new CreateBucketCommand({ Bucket: bucket }))
    log(`created bucket ${bucket}`)
  }
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true },
    }),
  )
  await s3.send(new PutBucketOwnershipControlsCommand({ Bucket: bucket, OwnershipControls: { Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }] } }))
  log('all public access blocked')
}

async function ensureOriginAccessControl(): Promise<string> {
  const list = await cloudfront.send(new ListOriginAccessControlsCommand({}))
  const found = list.OriginAccessControlList?.Items?.find((o) => o.Name === NAMES.originAccessControl)
  if (found?.Id) {
    log('origin access control already exists')
    return found.Id
  }
  const created = await cloudfront.send(
    new CreateOriginAccessControlCommand({
      OriginAccessControlConfig: {
        Name: NAMES.originAccessControl,
        Description: 'Lets the Vitalog distribution read the site bucket',
        SigningProtocol: 'sigv4',
        SigningBehavior: 'always',
        OriginAccessControlOriginType: 's3',
      },
    }),
  )
  log('created origin access control')
  return created.OriginAccessControl!.Id!
}

async function ensureRewriteFunction(): Promise<string> {
  const code = new TextEncoder().encode(SPA_REWRITE)
  const config = { Comment: 'Serve index.html for app routes', Runtime: 'cloudfront-js-2.0' as const }
  let etag: string | undefined
  try {
    const existing = await cloudfront.send(new DescribeFunctionCommand({ Name: NAMES.rewriteFunction, Stage: 'DEVELOPMENT' }))
    const updated = await cloudfront.send(
      new UpdateFunctionCommand({ Name: NAMES.rewriteFunction, IfMatch: existing.ETag, FunctionConfig: config, FunctionCode: code }),
    )
    etag = updated.ETag
    log('updated route rewrite function')
  } catch (err) {
    if (errorName(err) !== 'NoSuchFunctionExists') throw err
    const created = await cloudfront.send(new CreateFunctionCommand({ Name: NAMES.rewriteFunction, FunctionConfig: config, FunctionCode: code }))
    etag = created.ETag
    log('created route rewrite function')
  }
  const published = await cloudfront.send(new PublishFunctionCommand({ Name: NAMES.rewriteFunction, IfMatch: etag }))
  return published.FunctionSummary!.FunctionMetadata!.FunctionARN!
}

async function findDistribution(): Promise<DistributionSummary | undefined> {
  let marker: string | undefined
  do {
    const page = await cloudfront.send(new ListDistributionsCommand({ Marker: marker }))
    const found = page.DistributionList?.Items?.find((d) => d.Comment === NAMES.distributionComment)
    if (found) return found
    marker = page.DistributionList?.IsTruncated ? page.DistributionList.NextMarker : undefined
  } while (marker)
  return undefined
}

async function ensureDistribution(bucket: string, originAccessControlId: string, rewriteFunctionArn: string) {
  const existing = await findDistribution()
  if (existing) {
    log(`distribution ${existing.Id} already exists`)
    return { id: existing.Id!, arn: existing.ARN!, domain: existing.DomainName! }
  }
  const created = await cloudfront.send(
    new CreateDistributionCommand({
      DistributionConfig: distributionConfig({ bucket, region: REGION, originAccessControlId, rewriteFunctionArn, callerReference: `vitalog-${Date.now()}` }),
    }),
  )
  const d = created.Distribution!
  log(`created distribution ${d.Id} (it takes a few minutes to go live everywhere)`)
  return { id: d.Id!, arn: d.ARN!, domain: d.DomainName! }
}

async function ensureDeployUser(bucket: string, distributionArn: string) {
  try {
    await iam.send(new GetUserCommand({ UserName: NAMES.deployUser }))
    log(`user ${NAMES.deployUser} already exists`)
  } catch (err) {
    if (errorName(err) !== 'NoSuchEntityException' && errorName(err) !== 'NoSuchEntity') throw err
    await iam.send(new CreateUserCommand({ UserName: NAMES.deployUser, Tags: [{ Key: 'project', Value: 'vitalog' }] }))
    log(`created user ${NAMES.deployUser}`)
  }
  await iam.send(
    new PutUserPolicyCommand({ UserName: NAMES.deployUser, PolicyName: NAMES.deployPolicy, PolicyDocument: JSON.stringify(deployPolicy(bucket, distributionArn)) }),
  )
  log('limited it to uploading the site and clearing the cache')

  const keys = (await iam.send(new ListAccessKeysCommand({ UserName: NAMES.deployUser }))).AccessKeyMetadata ?? []
  if (keys.length && !newKey) {
    log('it already has an access key; rerun with --new-key to replace it')
    return null
  }
  for (const k of keys) await iam.send(new DeleteAccessKeyCommand({ UserName: NAMES.deployUser, AccessKeyId: k.AccessKeyId }))
  const created = await iam.send(new CreateAccessKeyCommand({ UserName: NAMES.deployUser }))
  return { id: created.AccessKey!.AccessKeyId!, secret: created.AccessKey!.SecretAccessKey! }
}

async function main() {
  console.log(`Setting up Vitalog hosting with the "${profile}" profile in ${REGION}\n`)
  const account = await step('Checking the AWS sign-in', async () => (await sts.send(new GetCallerIdentityCommand({}))).Account!)
  const bucket = bucketNameFor(account)

  await step('Site bucket', () => ensureBucket(bucket))
  const oac = await step('CloudFront access to the bucket', ensureOriginAccessControl)
  const fn = await step('App route rewrite', ensureRewriteFunction)
  const dist = await step('CloudFront distribution', () => ensureDistribution(bucket, oac, fn))
  await step('Bucket policy', async () => {
    await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(bucketPolicy(bucket, dist.arn)) }))
    log('only this distribution can read the bucket')
  })
  const key = await step('GitHub deploy user', () => ensureDeployUser(bucket, dist.arn))

  console.log('\nDone. Add these in GitHub → Settings → Secrets and variables → Actions:\n')
  console.log('  Variables')
  console.log(`    SITE_BUCKET      = ${bucket}`)
  console.log(`    DISTRIBUTION_ID  = ${dist.id}`)
  if (key) {
    console.log('  Secrets (the secret key is shown only this once)')
    console.log(`    AWS_ACCESS_KEY_ID     = ${key.id}`)
    console.log(`    AWS_SECRET_ACCESS_KEY = ${key.secret}`)
  }
  console.log(`\nThe site will be at https://${dist.domain}`)
}

main().catch((err) => {
  if (errorName(err) === 'CredentialsProviderError') {
    console.error(`\n✗ No usable AWS sign-in for the "${profile}" profile. Check it with: aws sts get-caller-identity --profile ${profile}\n`)
  } else if (!/AccessDenied|not authorized/i.test(errorName(err) + String((err as Error).message))) console.error(err)
  process.exit(1)
})
