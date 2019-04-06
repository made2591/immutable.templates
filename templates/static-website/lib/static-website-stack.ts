import cdk = require('@aws-cdk/cdk');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require("@aws-cdk/aws-codepipeline");
import iam = require("@aws-cdk/aws-iam");
import lambda = require('@aws-cdk/aws-lambda');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');

import { PolicyStatement, PolicyStatementEffect } from '@aws-cdk/aws-iam';

export class StaticWebsiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostedZoneId = process.env.HOSTED_ZONE_ID || ""
    const domainName = process.env.DOMAIN_NAME || ""
    const cdnPriceClass = process.env.CDN_PRICE_CLASS || ""
    const cdnCertificateArn = process.env.CDN_CERTIFICATE_ARN || ""
    const codeBuildImage = process.env.CODE_BUILD_IMAGE || ""
    const githubRepositoryOwnerUsername = process.env.GITHUB_REPOSITORY_OWNER_USERNAME || ""
    const githubRepositoryName = process.env.GITHUB_REPOSITORY_NAME || ""
    const githubOauthToken = process.env.GITHUB_OAUTH_TOKEN || ""

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
        image: codeBuildImage
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
                "codepipeline.amazonaws.com",
                "lambda.amazonaws.com"
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
                  'lambda:ListFunctions',
                  'lambda:InvokeFunction'
                ],
                "Resource": "*"
              }
            ]
          }
        }
      ]
    })

    // create origin access identity
    var contentCDNOAI = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, "contentCDNOAI", {
      cloudFrontOriginAccessIdentityConfig: {
        comment: domainName
      }
    })

    // create content CDN
    var contentCDN = new cloudfront.CfnDistribution(this, "contentCDN", {
      distributionConfig: {
        aliases: [
          domainName
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
        priceClass: cdnPriceClass,
        viewerCertificate: {
          acmCertificateArn: cdnCertificateArn,
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
      "codepipeline:PutJobFailureResult",
      "cloudfront:CreateInvalidation"
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
                owner: "ThirdParty",
                provider: "GitHub",
                version: "1"
              },
              configuration: {
                "Owner": githubRepositoryOwnerUsername,
                "Branch": "master",
                "PollForSourceChanges": false,
                "Repo": githubRepositoryName,
                "OAuthToken": githubOauthToken
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

    new lambda.CfnPermission(this, "codepipelinePermissionLambdaInvoke", {
      functionName: invalidationLambda.functionArn,
      action: "lambda:InvokeFunction",
      principal: "codepipeline.amazonaws.com"
    })

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
      hostedZoneId: hostedZoneId,
      recordSets: [
        {
          name: domainName + ".",
          type: "A",
          aliasTarget: {
            hostedZoneId: "Z2FDTNDATAQYW2",
            dnsName: contentCDN.distributionDomainName
          }
        }
      ]
    })

    // github webhook
    new codepipeline.CfnWebhook(this, "githubWebhook", {
      authentication: "GITHUB_HMAC",
      authenticationConfiguration: {
        secretToken: githubOauthToken
      },
      registerWithThirdParty: true,
      filters: [{
        jsonPath: "$.ref",
        matchEquals: "refs/heads/{Branch}",
      }],
      targetPipeline: pipeline.pipelineName,
      targetAction: "GitCheckout",
      targetPipelineVersion: 1
    });

  }

}
