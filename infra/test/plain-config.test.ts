import { describe, expect, it } from 'vitest'
import { MANAGED, NAMES, bucketNameFor, bucketPolicy, deployPolicy, distributionConfig } from '../lib/plain-config'

const BUCKET = bucketNameFor('123456789012')
const DIST_ARN = 'arn:aws:cloudfront::123456789012:distribution/E123'

describe('plain hosting config', () => {
  it('serves the private bucket over HTTPS through the access control, with the route rewrite', () => {
    const c = distributionConfig({ bucket: BUCKET, region: 'us-east-1', originAccessControlId: 'OAC1', rewriteFunctionArn: 'arn:fn', callerReference: 'x' })
    expect(c.Comment).toBe(NAMES.distributionComment)
    expect(c.Origins?.Items?.[0]).toMatchObject({ DomainName: `${BUCKET}.s3.us-east-1.amazonaws.com`, OriginAccessControlId: 'OAC1' })
    expect(c.DefaultCacheBehavior).toMatchObject({
      ViewerProtocolPolicy: 'redirect-to-https',
      CachePolicyId: MANAGED.cachingOptimized,
      ResponseHeadersPolicyId: MANAGED.securityHeaders,
    })
    expect(c.DefaultCacheBehavior?.FunctionAssociations?.Items).toEqual([{ EventType: 'viewer-request', FunctionARN: 'arn:fn' }])
    expect(c.DefaultCacheBehavior?.AllowedMethods?.Items).toEqual(['GET', 'HEAD'])
  })

  it('lets only this distribution read the bucket, and refuses plain HTTP', () => {
    const [allow, deny] = bucketPolicy(BUCKET, DIST_ARN).Statement
    expect(allow).toMatchObject({ Effect: 'Allow', Principal: { Service: 'cloudfront.amazonaws.com' }, Action: 's3:GetObject' })
    expect(allow?.Condition).toEqual({ StringEquals: { 'AWS:SourceArn': DIST_ARN } })
    expect(deny).toMatchObject({ Effect: 'Deny', Condition: { Bool: { 'aws:SecureTransport': 'false' } } })
  })

  it('gives the deploy user only the site bucket and cache clearing', () => {
    const statements = deployPolicy(BUCKET, DIST_ARN).Statement
    const actions = statements.flatMap((s) => [s.Action].flat())
    expect(actions.sort()).toEqual(['cloudfront:CreateInvalidation', 's3:DeleteObject', 's3:GetObject', 's3:ListBucket', 's3:PutObject'])
    for (const s of statements) {
      expect(s.Effect).toBe('Allow')
      expect(String(s.Resource)).not.toContain('*:*')
      expect([BUCKET, DIST_ARN].some((r) => String(s.Resource).includes(r))).toBe(true)
    }
  })
})
