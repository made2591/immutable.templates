import cdk = require("@aws-cdk/cdk");
import cloudfront = require("@aws-cdk/aws-cloudfront");
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require("@aws-cdk/aws-codepipeline");
import codepipelineactions = require("@aws-cdk/aws-codepipeline-actions");
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");
import s3 = require("@aws-cdk/aws-s3");
import secretsmanager = require('@aws-cdk/aws-secretsmanager');

import { ComputeType, LinuxBuildImage } from "@aws-cdk/aws-codebuild";
import { PolicyStatementEffect } from "@aws-cdk/aws-iam";
import { Stage } from "../stage-env/stage-env";

interface WebsitePipelineStackProps extends cdk.StackProps {
    stage: Stage;
    projectName: string;
    artifactBucket: s3.BucketImportProps;
    contentBucket: s3.BucketImportProps;
    githubRepositoryUsername: string;
    githubRepositoryName: string;
    githubOauthTokenArn: string;
    githubOauthToken: string;
    contentCDN: cloudfront.CloudFrontWebDistribution;
    buildImage: string;
}

export interface WebsitePipelineStack extends cdk.Stack {
    pipeline: codepipeline.Pipeline;
    codebuildProject: codebuild.Project;
    invalidationLambda: lambda.Function;
}

export class WebsitePipelineStack extends cdk.Stack {

    constructor(scope: cdk.App, id: string, props: WebsitePipelineStackProps) {
        super(scope, id, props);

        // import resources from properties
        const artifactBucket = s3.Bucket.import(this, props.stage.toString() + "-artifact", props.artifactBucket)
        const contentBucket = s3.Bucket.import(this, props.stage.toString() + "-content", props.contentBucket)

        // create build project
        this.codebuildProject = new codebuild.PipelineProject(this, props.stage.toString() + "-" + props.projectName + "-codebuild", {
            environment: {
                computeType: ComputeType.Small,
                buildImage: LinuxBuildImage.UBUNTU_14_04_RUBY_2_5_1
            }
        })
        
        var githubWebhook = secretsmanager.Secret.import(this, 'github-token', { 
            secretArn: props.githubOauthTokenArn,
        })

        // create git checkout action
        var gitCheckoutAction = new codepipelineactions.GitHubSourceAction({
            actionName: "GitHubCheckout",
            output: new codepipeline.Artifact("SourceArtifact"),
            owner: props.githubRepositoryUsername,
            repo: props.githubRepositoryName,
            branch: props.stage.toString() == Stage.Prod ? "master" : props.stage.toString(),
            oauthToken: githubWebhook.secretJsonValue("secret"),
            pollForSourceChanges: false,
            runOrder: 1
        })

        console.log(gitCheckoutAction)

        // create build action
        var buildAction = new codepipelineactions.CodeBuildAction({
            actionName: "Build",
            project: this.codebuildProject,
            input: gitCheckoutAction.outputs[0],
            output: new codepipeline.Artifact("BuildArtifact"),
        })

        // create deploy action
        var deployAction = new codepipelineactions.S3DeployAction({
            actionName: "Deploy",
            input: buildAction.outputs[0],
            extract: true,
            bucket: contentBucket
        })

        // create logs policy statement for invalidation lambda
        var policyStatementForLogs = new iam.PolicyStatement(PolicyStatementEffect.Allow);
        policyStatementForLogs.addAction("logs:*")
        policyStatementForLogs.addResource("arn:aws:logs:*:*:*")

        // create cloudfront invalidation permissions statement for invalidation lambda
        var policyStatementForCloudfront = new iam.PolicyStatement(PolicyStatementEffect.Allow);
        policyStatementForCloudfront.addActions(
            "codepipeline:PutJobSuccessResult",
            "codepipeline:PutJobFailureResult",
            "cloudfront:CreateInvalidation"
        )
        policyStatementForCloudfront.addResource("*")

        // create invalidation lambda
        this.invalidationLambda = new lambda.Function(this, props.stage.toString() + "-" + props.projectName + "-invalidation", {
            runtime: lambda.Runtime.NodeJS810,
            handler: 'index.handler',
            code: lambda.Code.asset("lib/invalidation-lambda"),
            environment: {
                "DISTRIBUTION_ID": props.contentCDN.distributionId
            },
            initialPolicy: [policyStatementForLogs, policyStatementForCloudfront]
        })

        // create lambda invalidation action
        var invalidationAction = new codepipelineactions.LambdaInvokeAction({
            actionName: "CacheInvalidation",
            lambda: this.invalidationLambda,
        });

        // give to pipeline permission to invoke the invalidation lambda
        new lambda.CfnPermission(this, props.stage.toString() + "-" + props.projectName + "-invalidation-lambda", {
            functionName: this.invalidationLambda.functionArn,
            action: "lambda:InvokeFunction",
            principal: "codepipeline.amazonaws.com"
        })

        // create the pipeline
        this.pipeline = new codepipeline.Pipeline(this, props.stage.toString() + "-" + props.projectName + "-pipeline", {
            artifactBucket: artifactBucket,
            stages: [
                {
                    name: "Source",
                    actions: [gitCheckoutAction]
                },
                {
                    name: "Build",
                    actions: [buildAction],
                },
                {
                    name: "Deploy",
                    actions: [deployAction]
                },
                {
                    name: "Invalidate",
                    actions: [invalidationAction]
                }
            ]
        });

        // create logs policy statement for codebuild
        var logsPolicyStatementForCodebuild = new iam.PolicyStatement(PolicyStatementEffect.Allow);
        logsPolicyStatementForCodebuild.addActions(
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
        )
        logsPolicyStatementForCodebuild.addResources(
            "arn:aws:logs:" + this.region + ":" + this.accountId + ":log-group:/aws/codebuild/" + this.codebuildProject.projectName,
            "arn:aws:logs:" + this.region + ":" + this.accountId + ":log-group:/aws/codebuild/" + this.codebuildProject.projectName + ":*"
        );

        // create s3 policy statement for codebuild
        var s3PolicyStatementForCodebuild = new iam.PolicyStatement(PolicyStatementEffect.Allow);
        s3PolicyStatementForCodebuild.addActions(
            "s3:GetObject",
            "s3:GetObjectVersion",
            "s3:PutObject"
        )
        s3PolicyStatementForCodebuild.addResources(
            artifactBucket.bucketArn.toString() + "/*"
        );

        // put together policy statements for codebuild service
        var policyStatementsForCodebuild = new iam.Policy(this, props.stage.toString() + "-" + props.projectName + "-codebuild-statements", {
            statements: [
                logsPolicyStatementForCodebuild,
                s3PolicyStatementForCodebuild,
            ]
        })

        // create iam role for codebuild, attach policy created and grant principal service to use it
        var codebuildRole = new iam.Role(this, props.stage.toString() + "-" + props.projectName + "-codebuild-role", {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        })
        codebuildRole.attachInlinePolicy(policyStatementsForCodebuild)

        // create s3 artifact policy statement for codepipeline
        var s3artifactPolicyStatementForCodepipeline = new iam.PolicyStatement(PolicyStatementEffect.Allow)
        s3artifactPolicyStatementForCodepipeline.addActions(
            "s3:GetObject",
            "s3:GetObjectVersion",
            "s3:PutObject"
        )
        s3artifactPolicyStatementForCodepipeline.addResources(
            artifactBucket.bucketArn.toString() + "/*"
        );

        // create codebuild policy statement for codepipeline
        var codebuildPolicyStatementForCodepipeline = new iam.PolicyStatement(PolicyStatementEffect.Allow)
        codebuildPolicyStatementForCodepipeline.addActions(
            "codebuild:BatchGetBuilds",
            "codebuild:StartBuild"
        )
        codebuildPolicyStatementForCodepipeline.addResources(
            this.codebuildProject.projectArn.toString()
        );

        // create s3 content policy statement for codepipeline
        var s3contentPolicyStatementForCodepipeline = new iam.PolicyStatement(PolicyStatementEffect.Allow)
        s3contentPolicyStatementForCodepipeline.addActions(
            "s3:PutObject",
            "s3:DeleteObject"
        )
        s3contentPolicyStatementForCodepipeline.addResources(
            contentBucket.bucketArn.toString(),
            contentBucket.bucketArn.toString() + "/*"
        );

        // create lambda policy statement for codepipeline
        var lambdaPolicyStatementForCodepipeline = new iam.PolicyStatement(PolicyStatementEffect.Allow)
        lambdaPolicyStatementForCodepipeline.addActions(
            'lambda:ListFunctions',
            'lambda:InvokeFunction'
        )
        lambdaPolicyStatementForCodepipeline.addResources(
            "*"
        );

        // put together policy statements for codepipeline service
        var policyStatementsForCodepipeline = new iam.Policy(this, props.stage.toString() + "-" + props.projectName + "-codepipeline-statements", {
            statements: [
                s3artifactPolicyStatementForCodepipeline,
                codebuildPolicyStatementForCodepipeline,
                s3contentPolicyStatementForCodepipeline,
                lambdaPolicyStatementForCodepipeline
            ]
        })

        // create iam role for codepipeline, attach policy created and grand principal services to use it
        var pipelineRole = new iam.Role(this, props.stage.toString() + "-" + props.projectName + "-codepipeline-role", {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        });
        pipelineRole.grant(new iam.ServicePrincipal('lambda.amazonaws.com'))
        pipelineRole.attachInlinePolicy(policyStatementsForCodepipeline)

        // // github webhook
        // new codepipeline.CfnWebhook(this, props.stage.toString() + "-" + props.projectName + "-githubWebhook", {
        //     authentication: "GITHUB_HMAC",
        //     authenticationConfiguration: {
        //         secretToken: githubWebhook.secretJsonValue("secret").toString()
        //     },
        //     registerWithThirdParty: true,
        //     filters: [{
        //         jsonPath: "$.ref",
        //         matchEquals: "refs/heads/{Branch}",
        //     }],
        //     targetPipeline: this.pipeline.pipelineName,
        //     targetAction: gitCheckoutAction.actionName,
        //     targetPipelineVersion: 1
        // });

    }

}