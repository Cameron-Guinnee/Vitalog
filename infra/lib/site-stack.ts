import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import type { Construct } from 'constructs'

export type SiteStackProps = StackProps & {
  /** The GitHub repository allowed to deploy, as "owner/name". */
  githubRepo: string
  /** The branch whose workflow runs may deploy. */
  deployBranch: string
}

/**
 * Paths without a file extension are app routes, such as /diary or /trends/charts,
 * so CloudFront serves the app shell and React Router takes it from there. Missing
 * files with an extension still get a real 404.
 */
export const SPA_REWRITE = `function handler(event) {
  var request = event.request;
  if (!/\\.[A-Za-z0-9]+$/.test(request.uri)) request.uri = '/index.html';
  return request;
}`

/**
 * The web app: a private S3 bucket served only through CloudFront, and a role that
 * GitHub Actions can take on to publish new builds. The role can upload files and
 * clear the cache, nothing else, so infrastructure changes still go through `cdk deploy`.
 */
export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props)

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    })

    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      code: cloudfront.FunctionCode.fromInline(SPA_REWRITE),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Serve index.html for app routes',
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Vitalog web app',
      defaultRootObject: 'index.html',
      // North America and Europe edge locations only: the cheapest price class.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [{ function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      errorResponses: [{ httpStatus: 404, ttl: Duration.minutes(1) }],
    })

    // GitHub Actions signs in with a short-lived token instead of stored AWS keys.
    const github = new iam.OidcProviderNative(this, 'GitHubOidc', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    })

    const deployRole = new iam.Role(this, 'GitHubDeployRole', {
      description: `Lets ${props.githubRepo} publish the web app from ${props.deployBranch}`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(github.oidcProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:sub': `repo:${props.githubRepo}:ref:refs/heads/${props.deployBranch}`,
        },
      }),
    })
    bucket.grantReadWrite(deployRole)
    distribution.grantCreateInvalidation(deployRole)

    new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` })
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName })
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId })
    new CfnOutput(this, 'DeployRoleArn', { value: deployRole.roleArn })
  }
}
