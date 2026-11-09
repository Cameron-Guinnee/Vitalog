// The same hosting as the CDK stack, described as plain API inputs. Used by
// scripts/setup-site.ts on accounts where CloudFormation isn't allowed, such as
// AWS free-plan accounts.
import type { DistributionConfig } from '@aws-sdk/client-cloudfront'

export const NAMES = {
  /** Comment that marks the distribution as Vitalog's, so reruns find it. */
  distributionComment: 'Vitalog web app',
  originAccessControl: 'vitalog-site',
  rewriteFunction: 'vitalog-spa-rewrite',
  deployUser: 'vitalog-github-deploy',
  deployPolicy: 'vitalog-site-deploy',
} as const

/** AWS managed CloudFront policies, by their fixed ids. */
export const MANAGED = {
  cachingOptimized: '658327ea-f89d-4fab-a63d-7e88639e58f6',
  securityHeaders: '67f7725c-6f97-4210-82d7-5512b31e9d03',
} as const

export const bucketNameFor = (accountId: string) => `vitalog-site-${accountId}`

const ORIGIN_ID = 'site-bucket'

export function distributionConfig(opts: {
  bucket: string
  region: string
  originAccessControlId: string
  rewriteFunctionArn: string
  callerReference: string
}): DistributionConfig {
  return {
    CallerReference: opts.callerReference,
    Comment: NAMES.distributionComment,
    Enabled: true,
    DefaultRootObject: 'index.html',
    // North America and Europe edge locations only: the cheapest price class.
    PriceClass: 'PriceClass_100',
    HttpVersion: 'http2and3',
    IsIPV6Enabled: true,
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: ORIGIN_ID,
          DomainName: `${opts.bucket}.s3.${opts.region}.amazonaws.com`,
          OriginAccessControlId: opts.originAccessControlId,
          S3OriginConfig: { OriginAccessIdentity: '' },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: ORIGIN_ID,
      ViewerProtocolPolicy: 'redirect-to-https',
      Compress: true,
      CachePolicyId: MANAGED.cachingOptimized,
      ResponseHeadersPolicyId: MANAGED.securityHeaders,
      AllowedMethods: { Quantity: 2, Items: ['GET', 'HEAD'], CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] } },
      FunctionAssociations: { Quantity: 1, Items: [{ EventType: 'viewer-request', FunctionARN: opts.rewriteFunctionArn }] },
    },
    CustomErrorResponses: { Quantity: 1, Items: [{ ErrorCode: 404, ErrorCachingMinTTL: 60 }] },
  }
}

/** Only CloudFront, and only this distribution, may read the bucket; plain HTTP is refused. */
export function bucketPolicy(bucket: string, distributionArn: string) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowCloudFrontRead',
        Effect: 'Allow',
        Principal: { Service: 'cloudfront.amazonaws.com' },
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucket}/*`,
        Condition: { StringEquals: { 'AWS:SourceArn': distributionArn } },
      },
      {
        Sid: 'DenyInsecureTransport',
        Effect: 'Deny',
        Principal: '*',
        Action: 's3:*',
        Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
        Condition: { Bool: { 'aws:SecureTransport': 'false' } },
      },
    ],
  }
}

/** What GitHub's deploy user may do: upload the site and clear the cache. Nothing else. */
export function deployPolicy(bucket: string, distributionArn: string) {
  return {
    Version: '2012-10-17',
    Statement: [
      { Sid: 'ListSite', Effect: 'Allow', Action: 's3:ListBucket', Resource: `arn:aws:s3:::${bucket}` },
      { Sid: 'WriteSite', Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'], Resource: `arn:aws:s3:::${bucket}/*` },
      { Sid: 'ClearCache', Effect: 'Allow', Action: 'cloudfront:CreateInvalidation', Resource: distributionArn },
    ],
  }
}
