import cdk = require('@aws-cdk/cdk');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require("@aws-cdk/aws-codepipeline");
import events = require("@aws-cdk/aws-events");
import iam = require("@aws-cdk/aws-iam");
import lambda = require('@aws-cdk/aws-lambda');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');

import stackConfig = require("./static-website-config");
import { PolicyStatement, PolicyStatementEffect } from '@aws-cdk/aws-iam';

export class StaticWebsiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create global configuration
    const globalConfig = new stackConfig.StaticWebsiteConfig();

    // log configuration for debug
    // console.log('debug', globalConfig.config);
    globalConfig.config["HostedZoneId"] = "YOUR_HOSTED_ZONE_ID"
    globalConfig.config["DomainName"] = "YOUR_DOMAIN_NAME"
    globalConfig.config["CodeBuildImage"] = "YOUR_CODE_BUILD_IMAGE" // aws/codebuild/ruby:2.5.3 for Jekyll
    globalConfig.config["CDNCertificateArn"] = "YOUR_CDN_CERTIFICATE_ARN" // created in Virginia
    globalConfig.config["CDNPriceClass"] = "YOUR_CDN_PRICE_CLASS"

    // create artifact bucket
    var artifactBucket = new s3.CfnBucket(this, "artifactBucket", {
      bucketEncryption: {
        serverSideEncryptionConfiguration: [
          {
            serverSideEncryptionByDefault: {
              sseAlgorithm: "AES256"
            }
          }
        ]
      },
      accessControl: "Private"
    });

    // create content bucket
    var contentBucket = new s3.CfnBucket(this, "contentBucket", {
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

    // create content bucket
    var loggingBucket = new s3.CfnBucket(this, "loggingBucket", {
      bucketEncryption: {
        serverSideEncryptionConfiguration: [
          {
            serverSideEncryptionByDefault: {
              sseAlgorithm: "AES256"
            }
          }
        ]
      },
      accessControl: "Private"
    });

    // create git repository to store artifact
    var gitRepository = new codecommit.CfnRepository(this, 'gitRepository', {
      repositoryName: globalConfig.config["DomainName"],
      repositoryDescription: 'Repository of static website ' + globalConfig.config["DomainName"]
    });

    // create codebuild service role
    var codeBuildServiceRole = new iam.CfnRole(this, "codeBuildServiceRole", {
      assumeRolePolicyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "codebuild.amazonaws.com"
              ]
            },
            "Action": [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      roleName: "CodeBuildServiceRole"
    });

    // create codebuild project
    var codeBuildProject = new codebuild.CfnProject(this, "codeBuildProject", {
      serviceRole: codeBuildServiceRole.roleArn.toString(),
      artifacts: {
        type: "CODEPIPELINE",
      },
      environment: {
        type: "LINUX_CONTAINER",
        computeType: "BUILD_GENERAL1_SMALL",
        image: globalConfig.config["CodeBuildImage"]
      },
      source: {
        type: "CODEPIPELINE"
      }
    });

    // create pipeline service role
    var pipelineServiceRole = new iam.CfnRole(this, "pipelineServiceRole", {
      assumeRolePolicyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "codepipeline.amazonaws.com"
              ]
            },
            "Action": [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      policies: [
        {
          policyName: "CodePipelineTrustPolicy",
          policyDocument: {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": [
                  "codecommit:CancelUploadArchive",
                  "codecommit:GetBranch",
                  "codecommit:GetCommit",
                  "codecommit:GetUploadArchiveStatus",
                  "codecommit:UploadArchive"
                ],
                "Resource": gitRepository.repositoryArn.toString()
              },
              {
                "Effect": "Allow",
                "Action": [
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:PutObject"
                ],
                "Resource": [
                  artifactBucket.bucketArn.toString() + "/*"
                ]
              },
              {
                "Effect": "Allow",
                "Action": [
                  "codebuild:BatchGetBuilds",
                  "codebuild:StartBuild"
                ],
                "Resource": codeBuildProject.projectArn.toString()
              },
              {
                "Effect": "Allow",
                "Action": [
                  "s3:PutObject",
                  "s3:DeleteObject"
                ],
                "Resource": [
                  contentBucket.bucketArn.toString(),
                  contentBucket.bucketArn.toString() + "/*"
                ]
              }
            ]
          }
        }
      ]
    })

    // create origin access identity
    var contentCDNOAI = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, "contentCDNOAI", {
      cloudFrontOriginAccessIdentityConfig: {
        comment: globalConfig.config["DomainName"]
      }
    })

    // create content CDN
    var contentCDN = new cloudfront.CfnDistribution(this, "contentCDN", {
      distributionConfig: {
        aliases: [
          globalConfig.config["DomainName"]
        ],
        origins: [
          {
            domainName: cdk.Fn.select(2, cdk.Fn.split("/", contentBucket.bucketWebsiteUrl)),
            id: "ContentBucketOrigin",
            customOriginConfig: {
              httpPort: 80,
              httpsPort: 443,
              originProtocolPolicy: "http-only"
            }
          }
        ],
        enabled: true,
        httpVersion: "http2",
        comment: "CDN for content bucket",
        defaultRootObject: "index.html",
        logging: {
          includeCookies: false,
          bucket: loggingBucket.bucketDomainName,
          prefix: "logging"
        },
        defaultCacheBehavior: {
          targetOriginId: "ContentBucketOrigin",
          compress: true,
          forwardedValues: {
            queryString: false
          },
          viewerProtocolPolicy: "redirect-to-https"
        },
        priceClass: globalConfig.config["CDNPriceClass"],
        viewerCertificate: {
          acmCertificateArn: globalConfig.config["CDNCertificateArn"],
          sslSupportMethod: "sni-only"
        }
      }
    });

    // invalidation lambda
    var policyStatementForLogs = new PolicyStatement(PolicyStatementEffect.Allow);
    policyStatementForLogs.addAction("logs:*")
    policyStatementForLogs.addResource("arn:aws:logs:*:*:*")

    var policyStatementForCloudfront = new PolicyStatement(PolicyStatementEffect.Allow);
    policyStatementForCloudfront.addActions(
      "codepipeline:PutJobSuccessResult",
      "codepipeline:PutJobFailureResult"
    )
    policyStatementForCloudfront.addResource("*")

    var invalidationLambda = new lambda.Function(this, "invalidationLambda", {
      runtime: lambda.Runtime.NodeJS810,
      handler: 'index.handler',
      code: lambda.Code.asset("./lib/invalidation-lambda"),
      environment: {
        "DISTRIBUTION_ID": contentCDN.distributionId
      },
      initialPolicy: [policyStatementForLogs, policyStatementForCloudfront]
    })

    // create pipeline
    var pipeline = new codepipeline.CfnPipeline(this, "pipeline", {
      roleArn: pipelineServiceRole.roleArn.toString(),
      artifactStore: {
        type: "S3",
        location: artifactBucket.bucketName.toString()
      },
      stages: [
        {
          name: "Source",
          actions: [
            {
              name: "GitCheckout",
              actionTypeId: {
                category: "Source",
                owner: "AWS",
                provider: "CodeCommit",
                version: "1"
              },
              configuration: {
                "BranchName": "master",
                "PollForSourceChanges": false,
                "RepositoryName": gitRepository.repositoryName
              },
              outputArtifacts: [
                {
                  name: "SourceArtifact"
                }
              ]
            }
          ]
        },
        {
          name: "Build",
          actions:
            [
              {
                name: "Build",
                actionTypeId: {
                  category: "Build",
                  owner: "AWS",
                  provider: "CodeBuild",
                  version: "1"
                },
                configuration: {
                  "ProjectName": codeBuildProject.projectName
                },
                inputArtifacts: [
                  {
                    name: "SourceArtifact"
                  }
                ],
                outputArtifacts: [
                  {
                    name: "BuildArtifact"
                  }
                ]
              }
            ]
        },
        {
          name: "Deploy",
          actions: [
            {
              name: "Deploy",
              actionTypeId: {
                category: "Deploy",
                owner: "AWS",
                provider: "S3",
                version: "1"
              },
              configuration: {
                "BucketName": contentBucket.bucketName.toString(),
                "Extract": true
              },
              inputArtifacts: [
                {
                  name: "BuildArtifact"
                }
              ]
            }
          ]
        },
        {
          name: "Invalidation",
          actions: [
            {
              name: "Invalidation",
              actionTypeId: {
                category: "Invoke",
                owner: "AWS",
                provider: "Lambda",
                version: "1",
              },
              inputArtifacts: [],
              outputArtifacts: [],
              configuration: {
                "FunctionName": invalidationLambda.functionName.toString()
              }
            }
          ]
        }
      ]
    });

    // create trigger service role
    var triggerServiceRole = new iam.CfnRole(this, "triggerServiceRole", {
      assumeRolePolicyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "events.amazonaws.com"
              ]
            },
            "Action": [
              "sts:AssumeRole"
            ]
          }
        ]
      },
      policies: [
        {
          policyName: "CodePipelineRunPolicy",
          policyDocument: {
            "Version": "2012-10-17",
            "Statement": [
              {
                "Effect": "Allow",
                "Action": [
                  "codepipeline:StartPipelineExecution"
                ],
                "Resource": "arn:aws:codepipeline:" + this.region + ":" + this.accountId + ":" + pipeline.pipelineName
              }
            ]
          }
        }
      ]
    });

    // create event rule
    new events.CfnRule(this, "trigger", {
      eventPattern: {
        "source": [
          "aws.codecommit"
        ],
        "detail-type": [
          "CodeCommit Repository State Change"
        ],
        "resources": [
          gitRepository.repositoryArn.toString()
        ],
        "detail": {
          "event": [
            "referenceCreated",
            "referenceUpdated"
          ],
          "referenceType": [
            "branch"
          ],
          "referenceName": [
            "master"
          ]
        }
      },
      targets: [
        {
          arn: "arn:aws:codepipeline:" + this.region + ":" + this.accountId + ":" + pipeline.pipelineName,
          roleArn: triggerServiceRole.roleArn.toString(),
          id: pipeline.pipelineName + "-runner"
        }
      ]
    });

    // create code build service role
    new iam.CfnPolicy(this, "codeBuildServiceRolePolicy", {
      policyName: "CodeBuildServiceRolePolicy",
      policyDocument: {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents"
            ],
            "Resource": [
              "arn:aws:logs:" + this.region + ":" + this.accountId + ":log-group:/aws/codebuild/" + codeBuildProject.projectName,
              "arn:aws:logs:" + this.region + ":" + this.accountId + ":log-group:/aws/codebuild/" + codeBuildProject.projectName + ":*"
            ]
          },
          {
            "Effect": "Allow",
            "Action": [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:PutObject"
            ],
            "Resource": [
              artifactBucket.bucketArn.toString() + "/*"
            ]
          }
        ]
      },
      roles: [
        codeBuildServiceRole.roleName.toString()
      ]
    });

    // content bucket policy
    new s3.CfnBucketPolicy(this, "contentBucketPolicy", {
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

    // create content record set group
    new route53.CfnRecordSetGroup(this, "contentRecordSet", {
      hostedZoneId: globalConfig.config["HostedZoneId"],
      recordSets: [
        {
          name: globalConfig.config["DomainName"] + ".",
          type: "A",
          aliasTarget: {
            hostedZoneId: "Z2FDTNDATAQYW2",
            dnsName: contentCDN.distributionDomainName
          }
        }
      ]
    })

    // new lambda.CfnFunction(this, "cacheInvalidation", {

    // });

    // cloudfront:CreateInvalidation
    // codepipeline:PutJobSuccessResult


  }
}
