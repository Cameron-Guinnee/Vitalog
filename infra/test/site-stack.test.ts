import { App } from 'aws-cdk-lib'
import { Match, Template } from 'aws-cdk-lib/assertions'
import { describe, expect, it } from 'vitest'
import { SPA_REWRITE, SiteStack } from '../lib/site-stack'

function synth() {
  const app = new App()
  const stack = new SiteStack(app, 'Test', { githubRepo: 'owner/repo', deployBranch: 'main', env: { account: '123456789012', region: 'us-east-1' } })
  return Template.fromStack(stack)
}

describe('site stack', () => {
  const template = synth()

  it('keeps the bucket private and reachable only through CloudFront', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true },
    })
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1)
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        DefaultCacheBehavior: Match.objectLike({ ViewerProtocolPolicy: 'redirect-to-https' }),
      }),
    })
  })

  it('only lets the main branch of the repository deploy', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                'token.actions.githubusercontent.com:sub': 'repo:owner/repo:ref:refs/heads/main',
              },
            },
          }),
        ],
      },
    })
  })

  it('gives the deploy role no admin rights', () => {
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'))
    expect(policies).not.toMatch(/"Action":"\*"|"iam:|"cloudformation:/)
    expect(policies).toContain('cloudfront:CreateInvalidation')
    expect(policies).toContain('s3:PutObject')
  })
})

describe('app route rewrite', () => {
  // The CloudFront function body, run the same way CloudFront does.
  const handler = new Function(`${SPA_REWRITE}; return handler`)() as (e: { request: { uri: string } }) => { uri: string }
  const rewrite = (uri: string) => handler({ request: { uri } }).uri

  it('sends app routes to the app shell and leaves files alone', () => {
    expect(rewrite('/diary')).toBe('/index.html')
    expect(rewrite('/trends/print-report')).toBe('/index.html')
    expect(rewrite('/')).toBe('/index.html')
    expect(rewrite('/assets/index-Ab12.js')).toBe('/assets/index-Ab12.js')
    expect(rewrite('/favicon.svg')).toBe('/favicon.svg')
  })
})
