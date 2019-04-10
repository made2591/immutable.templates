import cdk = require("@aws-cdk/cdk");
import cloudfront = require("@aws-cdk/aws-cloudfront");
import s3 = require("@aws-cdk/aws-s3");
import { BucketEncryption } from "@aws-cdk/aws-s3";
import { HttpVersion, PriceClass, ViewerProtocolPolicy, OriginProtocolPolicy } from "@aws-cdk/aws-cloudfront";

interface WebsiteStorageStackProps extends cdk.StackProps {
    stage: string;
    domainName: string;
    priceClass: PriceClass;
    cdnCertificateArn: string;
}

export interface WebsiteStorageStack extends cdk.Stack {
    artifactBucket: s3.Bucket;
    loggingBucket: s3.Bucket;
    contentBucket: s3.CfnBucket;
    contentCDN: cloudfront.CloudFrontWebDistribution;
}

export class WebsiteStorageStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: WebsiteStorageStackProps) {
        super(scope, id, props);

        // create logging bucket
        this.loggingBucket = new s3.Bucket(this, "${props.stage}-logging", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })

        // create artifact bucket
        this.artifactBucket = new s3.Bucket(this, "${props.stage}-artifact", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })

        // create content bucket
        this.contentBucket = new s3.CfnBucket(this, "${props.stage}-content", {
            corsConfiguration: {
                corsRules: [
                    {
                        allowedOrigins: ["*"],
                        allowedMethods: ["GET"],
                        maxAge: 3000,
                        allowedHeaders: ["Authorization", "Content-Length"]
                    }
                ]
            },
            websiteConfiguration: {
                indexDocument: "index.html"
            }
        });

        // create origin access identity
        var contentCDNOAI = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, "${props.stage}-oai", {
            cloudFrontOriginAccessIdentityConfig: {
                comment: props.domainName
            }
        })

        // content bucket policy
        new s3.CfnBucketPolicy(this, "contentBucketPolicy", {
            bucket: this.contentBucket.bucketName.toString(),
            policyDocument: {
                "Statement": [
                    {
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Effect": "Allow",
                        "Resource": this.contentBucket.bucketArn.toString() + "/*",
                        "Principal": {
                            "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity " + contentCDNOAI.ref
                        }
                    },
                    {
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Effect": "Allow",
                        "Resource": this.contentBucket.bucketArn.toString() + "/*",
                        "Principal": "*"
                    }
                ]
            }
        })

        // create content CDN
        this.contentCDN = new cloudfront.CloudFrontWebDistribution(this, "${props.stage}-cdn", {
            aliasConfiguration: {
                names: [
                    "${stage}." + props.domainName
                ],
                acmCertRef: props.cdnCertificateArn
            },
            defaultRootObject: "index.html",
            httpVersion: HttpVersion.HTTP2,
            priceClass: props.priceClass,
            viewerProtocolPolicy: ViewerProtocolPolicy.RedirectToHTTPS,
            originConfigs: [
                {
                    customOriginSource: {
                        httpPort: 80,
                        httpsPort: 443,
                        originProtocolPolicy: OriginProtocolPolicy.HttpOnly,
                        domainName: this.contentBucket.bucketWebsiteUrl.split("/")[2]
                    },
                    behaviors: [
                        {
                            compress: true,
                            forwardedValues: {
                                queryString: false
                            }
                        }
                    ]
                }
            ]
        });
    }
}