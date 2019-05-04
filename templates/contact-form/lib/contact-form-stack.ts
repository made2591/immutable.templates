import cdk = require('@aws-cdk/cdk');
import apigateway = require('@aws-cdk/aws-apigateway');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require("@aws-cdk/aws-iam");
import { AttributeType } from '@aws-cdk/aws-dynamodb';
import { Stage } from '../lib/stage-env/stage-env';
import { PolicyStatementEffect } from '@aws-cdk/aws-iam';

interface ContactFormStackProps extends cdk.StackProps {
  stage: Stage;
  readCapacity: number;
  writeCapacity: number;
  partitionKey: string;
}

export interface ContactFormStack extends cdk.Stack {
  contactstable: dynamodb.Table;
  api: apigateway.RestApi;
}

export class ContactFormStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ContactFormStackProps) {
    super(scope, id, props);

    // create contact tables for registration
    this.contactstable = new dynamodb.Table(this, props.stage.toString() + '-contacts-table', {
      readCapacity: props.readCapacity,
      writeCapacity: props.writeCapacity,
      partitionKey: {
        name: props.partitionKey,
        type: AttributeType.String
      },
      tableName: props.stage.toString() + '-contacts-table'
    })

    // create lambda policy statement for api gateway
    var apigatewayPolicyStatement = new iam.PolicyStatement(PolicyStatementEffect.Allow)
    apigatewayPolicyStatement.addActions(
      'dynamodb:*'
    )
    apigatewayPolicyStatement.addResources(
      this.contactstable.tableArn
    );

    // put together policy statements for api gateway service
    var apigatewayPolicy = new iam.Policy(this, props.stage.toString() + "-apigateway-statements", {
      statements: [
        apigatewayPolicyStatement
      ]
    })

    // defining api gateway execution role to write to the table
    var apigatewayRole = new iam.Role(this, props.stage.toString() + "-codepipeline-role", {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    apigatewayRole.grant(new iam.ServicePrincipal('apigateway.amazonaws.com'))
    apigatewayRole.attachInlinePolicy(apigatewayPolicy)

    // create the proxy service integration to dynamodb
    var dynamoIntegration = new apigateway.AwsIntegration({
      proxy: false,
      service: "dynamodb",
      integrationHttpMethod: "POST",
      action: "PutItem",
      options: {
        credentialsRole: apigatewayRole,
        requestTemplates: {
          "application/json": "{\
            \"TableName\": \""+ props.stage.toString() + '-contacts-table' + "\",\
            \"Item\": {\
              \""+ props.partitionKey + "\": {\
                \"S\": \"$input.path('$.email')\"\
              },\
              \"name\": {\
                \"S\": \"$input.path('$.name')\"\
              }\
            }\
          }",
        },
        integrationResponses: [
          {
            statusCode: "200"
          }
        ]
      }
    });

    // define the api gateway and map the integration
    this.api = new apigateway.RestApi(this, 'contact-form');
    this.api.root.addMethod('ANY');
    var contacts = this.api.root.addResource('contacts');
    contacts.addMethod('POST', dynamoIntegration);

  }

}
