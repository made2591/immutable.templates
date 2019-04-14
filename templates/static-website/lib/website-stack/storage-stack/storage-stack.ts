import cdk = require("@aws-cdk/cdk");
import cloudfront = require("@aws-cdk/aws-cloudfront");
import route53 = require('@aws-cdk/aws-route53');
import s3 = require("@aws-cdk/aws-s3");

import { BucketEncryption } from "@aws-cdk/aws-s3";
import { HttpVersion, PriceClass, ViewerProtocolPolicy, OriginProtocolPolicy, SSLMethod } from "@aws-cdk/aws-cloudfront";

interface WebsiteStorageStackProps extends cdk.StackProps {
    stage: string;
    domainName: string;
    priceClass: PriceClass;
    cdnCertificateArn: string;
    hostedZoneId: string;
}

export interface WebsiteStorageStack extends cdk.Stack {
    artifactBucketRef: s3.BucketImportProps;
    loggingBucketRef: s3.BucketImportProps;
    contentBucketRef: s3.BucketImportProps;
    contentCDNRef: cloudfront.CloudFrontWebDistribution;
}

export class WebsiteStorageStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: WebsiteStorageStackProps) {
        super(scope, id, props);

        // create artifact bucket
        const artifactBucket = new s3.Bucket(this, props.stage + "-artifact", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })
        this.artifactBucketRef = artifactBucket.export();

        // create logging bucket
        const loggingBucket = new s3.Bucket(this, props.stage + "-logging", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })
        this.loggingBucketRef = loggingBucket.export();

        // create content bucket
        const contentBucket = new s3.CfnBucket(this, props.stage + "-content", {
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
        this.contentBucketRef = {
            bucketArn: contentBucket.bucketArn,
            bucketName: contentBucket.bucketName,
            bucketDomainName: contentBucket.bucketDomainName,
            bucketWebsiteUrl: contentBucket.bucketWebsiteUrl,
            bucketWebsiteNewUrlFormat: false
        };

        // create origin access identity
        var contentCDNOAI = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, props.stage + "-oai", {
            cloudFrontOriginAccessIdentityConfig: {
                comment: props.domainName
            }
        })

        // content bucket policy
        new s3.CfnBucketPolicy(this, props.stage + "-content-policy", {
            bucket: contentBucket.bucketName.toString(),
            policyDocument: {
                "Statement": [
                    {
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Effect": "Allow",
                        "Resource": contentBucket.bucketArn.toString() + "/*",
                        "Principal": {
                            "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity " + contentCDNOAI.ref
                        }
                    },
                    {
                        "Action": [
                            "s3:GetObject"
                        ],
                        "Effect": "Allow",
                        "Resource": contentBucket.bucketArn.toString() + "/*",
                        "Principal": "*"
                    }
                ]
            }
        })

        // create content CDN
        this.contentCDNRef = new cloudfront.CloudFrontWebDistribution(this, props.stage + "-cdn", {
            aliasConfiguration: {
                names: [
                    props.domainName
                ],
                sslMethod: SSLMethod.SNI,
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
                        domainName: cdk.Fn.select(2, cdk.Fn.split("/", contentBucket.bucketWebsiteUrl))
                    },
                    behaviors: [
                        {
                            isDefaultBehavior: true,
                            compress: true,
                            forwardedValues: {
                                queryString: false
                            }
                        }
                    ]
                }
            ]
        });

        // create content record set group
        new route53.CfnRecordSetGroup(this, props.stage + "content-recordset", {
            hostedZoneId: props.hostedZoneId,
            recordSets: [
                {
                    name: props.stage + props.domainName + ".",
                    type: "A",
                    aliasTarget: {
                        hostedZoneId: "Z2FDTNDATAQYW2",
                        dnsName: this.contentCDNRef.domainName
                    }
                }
            ]
        })

    }

}