import cdk = require('@aws-cdk/cdk');
import cloudfront = require('@aws-cdk/aws-cloudfront');
import codebuild = require('@aws-cdk/aws-codebuild');
import codecommit = require('@aws-cdk/aws-codecommit');
import codepipeline = require("@aws-cdk/aws-codepipeline");
import events = require("@aws-cdk/aws-events");
import iam = require("@aws-cdk/aws-iam");
import s3 = require('@aws-cdk/aws-s3');
import route53 = require('@aws-cdk/aws-route53');

import stackConfig = require("./static-website-config");

export class StaticWebsiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create global configuration
    const globalConfig = new stackConfig.StaticWebsiteConfig();

    // log configuration for debug
    // console.log('debug', globalConfig.config);

    // create artifact bucket
    var artifactBucket = new s3.Bucket(this, "artifactBucket", {
      bucketName: globalConfig.config["DomainName"] + "-artifact"
    });

    // create content bucket
    var contentBucket = new s3.Bucket(this, "contentBucket", {
      bucketName: globalConfig.config["DomainName"] + "-content"
    });

    // create content bucket
    var loggingBucket = new s3.Bucket(this, "loggingBucket", {
      bucketName: globalConfig.config["DomainName"] + "-logging",
      publicReadAccess: false
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
      }
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
                  gitRepository.repositoryArn.toString() + "/*"
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
                  contentBucket + "/*"
                ]
              }
            ]
          }
        }
      ]
    })

    // create pipeline
    var pipeline = new codepipeline.CfnPipeline(this, "pipeline", {
      roleArn: pipelineServiceRole.roleArn.toString(),
      artifactStore: {
        type: "s3",
        location: artifactBucket.bucketArn.toString()
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
                  "ProjectName": "CodeBuildProject"
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
                "BucketName": contentBucket.bucketName,
                "Extract": true
              },
              inputArtifacts: [
                {
                  name: "BuildArtifact"
                }
              ]
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
    new events.CfnRule(this, "commitEvent", {
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
          id: "arn:aws:codepipeline:" + this.region + ":" + this.accountId + ":" + pipeline.pipelineName + "-runner"
        }
      ]
    });

    // create code build service role
    new iam.CfnPolicy(this, "codeBuildServiceRolePolicy", {
      policyName: "CodeBuildTrustPolicy",
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
        codeBuildServiceRole.roleArn.toString()
      ]
    });

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
            domainName: contentBucket.domainName,
            id: "ContentBucketOrigin",
            s3OriginConfig: {
              originAccessIdentity: "origin-access-identity/cloudfront/" + contentCDNOAI.logicalId
            }
          }
        ],
        enabled: true,
        httpVersion: "http2",
        comment: "CDN for content bucket",
        defaultRootObject: "index.html",
        logging: {
          includeCookies: false,
          bucket: loggingBucket.domainName,
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

    // content bucket policy
    new s3.CfnBucketPolicy(this, "contentBucketPolicy", {
      bucket: contentBucket.bucketName,
      policyDocument: {
        "Statement": [
          {
            "Action": [
              "s3:GetObject"
            ],
            "Effect": "Allow",
            "Resource": contentBucket.bucketArn.toString() + "/*",
            "Principal": {
              "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity " + contentCDNOAI.logicalId
            }
          }
        ]
      },

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



  }
}
