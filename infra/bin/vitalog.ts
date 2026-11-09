import { App } from 'aws-cdk-lib'
import { SiteStack } from '../lib/site-stack'

const app = new App()

new SiteStack(app, 'VitalogSite', {
  description: 'Vitalog web app: S3, CloudFront and the GitHub deploy role',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // CloudFront certificates for a custom domain must live in us-east-1, so the whole stack does.
    region: 'us-east-1',
  },
  githubRepo: app.node.tryGetContext('githubRepo') ?? 'Cameron-Guinnee/Vitalog-2',
  deployBranch: app.node.tryGetContext('deployBranch') ?? 'main',
  tags: { project: 'vitalog' },
})
