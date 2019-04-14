import cdk = require("@aws-cdk/cdk");

import { PriceClass } from "@aws-cdk/aws-cloudfront";
import { WebsitePipelineStack } from "../lib/website-stack/pipeline-stack/pipeline-stack";
import { WebsiteStorageStack } from "../lib/website-stack/storage-stack/storage-stack";

const cdnCertificateArn = process.env.CDN_CERTIFICATE_ARN || ""
const cdnPriceClass = process.env.CDN_PRICE_CLASS || ""
const cdnPriceClassTyped: PriceClass = (<any>PriceClass)[cdnPriceClass]
const codeBuildImage = process.env.CODE_BUILD_IMAGE || ""
const domainName = process.env.DOMAIN_NAME || ""
const githubOauthToken = process.env.GITHUB_OAUTH_TOKEN || ""
const githubRepositoryName = process.env.GITHUB_REPOSITORY_NAME || ""
const githubRepositoryOwnerUsername = process.env.GITHUB_REPOSITORY_OWNER_USERNAME || ""
const hostedZoneId = process.env.HOSTED_ZONE_ID || ""

const app = new cdk.App();
new cdk.SecretValue(githubOauthToken, "github-token");

// Beta instance in the first environment
var storageStack = new WebsiteStorageStack(app, 'dev-storage-madeddu-xyz', {
    stage: 'dev',
    domainName: domainName,
    priceClass: cdnPriceClassTyped,
    cdnCertificateArn: cdnCertificateArn,
    hostedZoneId: hostedZoneId
});

new WebsitePipelineStack(app, 'dev-pipeline-madeddu-xyz', {
    stage: 'dev',
    projectName: domainName,
    buildImage: codeBuildImage,
    githubRepositoryUsername: githubRepositoryOwnerUsername,
    githubRepositoryName: githubRepositoryName,
    artifactBucket: storageStack.artifactBucketRef,
    contentBucket: storageStack.contentBucketRef,
    githubOauthToken: cdk.SecretValue.ssmSecure("github-token", "1"),
    contentCDN: storageStack.contentCDNRef
});

app.run()