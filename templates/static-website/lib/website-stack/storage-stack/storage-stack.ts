import cdk = require("@aws-cdk/cdk");
import cloudfront = require("@aws-cdk/aws-cloudfront");
import route53 = require('@aws-cdk/aws-route53');
import s3 = require("@aws-cdk/aws-s3");

import { BucketEncryption } from "@aws-cdk/aws-s3";
import { HttpVersion, PriceClass, ViewerProtocolPolicy, OriginProtocolPolicy, SSLMethod } from "@aws-cdk/aws-cloudfront";
import { Stage } from "../stage-env/stage-env";

interface WebsiteStorageStackProps extends cdk.StackProps {
    stage: Stage;
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
        const artifactBucket = new s3.Bucket(this, props.stage.toString() + "-artifact", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })
        this.artifactBucketRef = artifactBucket.export();

        // create logging bucket
        const loggingBucket = new s3.Bucket(this, props.stage.toString() + "-logging", {
            encryption: BucketEncryption.S3Managed,
            publicReadAccess: false
        })
        this.loggingBucketRef = loggingBucket.export();

        // create content bucket
        const contentBucket = new s3.CfnBucket(this, props.stage.toString() + "-content", {
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
        var contentCDNOAI = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, props.stage.toString() + "-oai", {
            cloudFrontOriginAccessIdentityConfig: {
                comment: props.domainName
            }
        })

        // content bucket policy
        new s3.CfnBucketPolicy(this, props.stage.toString() + "-content-policy", {
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

        // define first domain name aliases of cdn only for production
        var aliases = [
            props.stage.toString() + "." + props.domainName
        ]
        // define first domain name aliases of cdn only for production
        if (props.stage.toString() == Stage.Prod) {
            aliases.push(props.domainName);
        }

        // create content CDN
        this.contentCDNRef = new cloudfront.CloudFrontWebDistribution(this, props.stage.toString() + "-cdn", {
            aliasConfiguration: {
                names: aliases,
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

        // define first domain name record only for production
        var recordSetsReferences = [
            {
                name: props.stage.toString() + "." + props.domainName + ".",
                type: "A",
                aliasTarget: {
                    hostedZoneId: "Z2FDTNDATAQYW2",
                    dnsName: this.contentCDNRef.domainName
                }
            }
        ]
        // define first domain name record only for production
        if (props.stage.toString() == Stage.Prod) {
            recordSetsReferences.push({
                name: props.domainName + ".",
                type: "A",
                aliasTarget: {
                    hostedZoneId: "Z2FDTNDATAQYW2",
                    dnsName: this.contentCDNRef.domainName
                }
            });
        }

        // create content record set group
        new route53.CfnRecordSetGroup(this, props.stage.toString() + "-content-recordset", {
            hostedZoneId: props.hostedZoneId,
            recordSets: recordSetsReferences
        })

    }

}