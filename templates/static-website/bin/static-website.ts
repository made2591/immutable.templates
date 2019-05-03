import cdk = require("@aws-cdk/cdk");

import { PriceClass } from "@aws-cdk/aws-cloudfront";
import { WebsitePipelineStack } from "../lib/website-stack/pipeline-stack/pipeline-stack";
import { WebsiteStorageStack } from "../lib/website-stack/storage-stack/storage-stack";
import { Stage } from "../lib/website-stack/stage-env/stage-env";

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
var stage = Stage.Dev;
switch (process.env.STAGE) {
    case "dev": {
        stage = Stage.Dev;
        break
    }
    case "test": {
        stage = Stage.Test;
        break
    }
    case "prod": {
        stage = Stage.Prod;
        break
    }
    default: {
        stage = Stage.Dev;
        break;
    }
}
console.log('debug', process.env.STAGE, stage)

const cdnCertificateArn = process.env.CDN_CERTIFICATE_ARN || ""
const codeBuildImage = process.env.CODE_BUILD_IMAGE || ""
const domainName = process.env.DOMAIN_NAME || ""
const githubOauthToken = process.env.GITHUB_OAUTH_TOKEN || "" // key of token: "github-token"
const githubOauthTokenArn = process.env.GITHUB_OAUTH_TOKEN_ARN || "" // key of token: "github-token"
const githubRepositoryName = process.env.GITHUB_REPOSITORY_NAME || ""
const githubRepositoryOwnerUsername = process.env.GITHUB_REPOSITORY_OWNER_USERNAME || ""
const hostedZoneId = process.env.HOSTED_ZONE_ID || ""

const app = new cdk.App();

var storageStack = new WebsiteStorageStack(app, 'dev-storage-madeddu-xyz', {
    stage: stage,
    domainName: domainName,
    priceClass: cdnPriceClass,
    cdnCertificateArn: cdnCertificateArn,
    hostedZoneId: hostedZoneId
});

new WebsitePipelineStack(app, 'dev-pipeline-madeddu-xyz', {
    stage: stage,
    projectName: domainName,
    buildImage: codeBuildImage,
    githubRepositoryUsername: githubRepositoryOwnerUsername,
    githubRepositoryName: githubRepositoryName,
    artifactBucket: storageStack.artifactBucketRef,
    contentBucket: storageStack.contentBucketRef,
    githubOauthToken: githubOauthToken,
    githubOauthTokenArn: githubOauthTokenArn,
    contentCDN: storageStack.contentCDNRef
});

app.run()