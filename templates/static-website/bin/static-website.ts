import cdk = require("@aws-cdk/cdk");

import { PriceClass } from "@aws-cdk/aws-cloudfront";
import { WebsitePipelineStack } from "../lib/website-stack/pipeline-stack/pipeline-stack";
import { WebsiteStorageStack } from "../lib/website-stack/storage-stack/storage-stack";

const cdnCertificateArn = process.env.CDN_CERTIFICATE_ARN || ""
var cdnPriceClass = PriceClass.PriceClass100;
switch (process.env.CDN_PRICE_CLASS) {
    case "PriceClass_100": {
        cdnPriceClass = PriceClass.PriceClass100;
        break
    }
    case "PriceClass_100": {
        cdnPriceClass = PriceClass.PriceClass200;
        break;
    }
    case "PriceClass_All": {
        cdnPriceClass = PriceClass.PriceClassAll;
        break;
    }
    default: {
        cdnPriceClass = PriceClass.PriceClass100;
        break;
    }
}
const codeBuildImage = process.env.CODE_BUILD_IMAGE || ""
const domainName = process.env.DOMAIN_NAME || ""
const githubOauthToken = process.env.GITHUB_OAUTH_TOKEN || ""
const githubRepositoryName = process.env.GITHUB_REPOSITORY_NAME || ""
const githubRepositoryOwnerUsername = process.env.GITHUB_REPOSITORY_OWNER_USERNAME || ""
const hostedZoneId = process.env.HOSTED_ZONE_ID || ""

const app = new cdk.App();
new cdk.SecretValue(githubOauthToken, "github-token");

console.log('debug', {
    stage: 'dev',
    domainName: domainName,
    priceClass: cdnPriceClass,
    cdnCertificateArn: cdnCertificateArn,
    hostedZoneId: hostedZoneId
});

// Beta instance in the first environment
var storageStack = new WebsiteStorageStack(app, 'dev-storage-madeddu-xyz', {
    stage: 'dev',
    domainName: domainName,
    priceClass: cdnPriceClass,
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