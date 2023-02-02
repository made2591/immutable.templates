# Document Reader

The Document Reader stack let you deploy a serverless infrastructure to build OCR application that produce spoken text extracted from images you can provide throught REST API. It follows the producer/consumer schema presented [here](https://github.com/made2591/immutable.templates/blob/master/templates/producer-consumer/README.md) and uses a bunch of services from AWS:

- [AWS API Gateway](https://aws.amazon.com/api-gateway/), to provide pre-signed URL for upload documents;
- [AWS Lambda](https://aws.amazon.com/lambda/), to backend for computation;
- [AWS Simple Storage Service](https://aws.amazon.com/s3/), to provide storage for input and output;
- [AWS Simple Queue Service](https://aws.amazon.com/sqs/), to decouple the uploading part from the working one;
- [AWS DynamoDB](https://aws.amazon.com/dynamodb/), to persist references of jobs completed;
- [AWS Rekognition](https://aws.amazon.com/rekognition/), to provide engine as a service and extract text from document;
- [AWS Polly](https://aws.amazon.com/polly/), to provide text-to-speach functionality;

## Getting Started

This stack inherits from the [Producer/Consumer](https://github.com/made2591/immutable.templates/templates/producer-consumer) stack the same logic regarding the request of URL and pushing of the message: the extension is around an Lambda that act as a *consumer* of the object uploaded and by using Rekognition and Polly create speach of text recognized in the images. Below a schema of the stack as is:

![architecture_schema](/templates/document-reader/architecture.png)

Another schema with the parts in common with the [Producer/Consumer](https://github.com/made2591/immutable.templates/templates/producer-consumer) and the [Upload Form](https://github.com/made2591/immutable.templates/templates/upload-form) stacks.

![architecture_schema](/templates/document-reader/architecture-inherit.png)

A blog post is available [here](https://madeddu.xyz/posts/serverless-ocr/).

To use the stack / modify it, just clone the repository and move to the `templates/document-reader` folder starting from the root of the repository, like this:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/document-reader
# start deploy (see later)
```

## Architecture overview

The user asks to API Gateway (1) for a pre-signed URL to upload a document. The API Gateway will trigger a Lambda function (2) that will invoke the getSignedUrl URL action by using the S3 API (3) and provides back the URL to API Gateway (4) - that will forwards it directly to the user (6). The user is now able to push his document to S3 with the provided URL (7). When the document is uploaded, S3 will put a message over an SQS queue (8). The consumer will be able to retrieve the reference to the document sent by polling the SQS Queue (9). With this message, the consumer can ask to API Gateway the permission to retrieve the original document produced (10). Once the pre-signed URL is generated and sent back (11), it can retrieve safely the content of the message directly from S3 (12). A consumer Lambda provides the document retrieved (12) to Rekognition service (13) and get back the extracted text (13) if any. After that, it sends this text to Polly (15) and gets back an AudioStream (14) ready to be uploaded to S3. Before going ahead, it saves the references of the document, the extracted test, and the produced output to a DynamoDB table (17). Finally, it saves the AudioStream as a .mp3 file to S3 (18), where the document was originally stored by the user.

### Prerequisites

The only needed tool is [Node.js](https://nodejs.org/en/download/) - ≥ 8.11.x - and the [AWS Cloud Development Kit](https://github.com/awslabs/aws-cdk) - AWS CDK. You can install it by running

```
$ npm i -g aws-cdk
```

## Deployment of Stack

Just as any other CDK stack, this are the main commands that can help you with the most common actions:

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Built With

* [Node.js](https://nodejs.org/en/download/) - Node.js
* [AWS CDK](https://github.com/awslabs/aws-cdk) - AWS Cloud Development Kit

## Contributing

Please read [CONTRIBUTING.md](https://github.com/made2591/immutable.templates/CONTRIBUTING.md) for details on how to contact me.

## Authors

Almost all the stacks proposed in this repository, and their implementation, are deeply discussed between people below:

* **Matteo Madeddu** - *Design, Implementation* - [Github](https://github.com/made2591/), [LinkedIn](https://www.linkedin.com/in/mmadeddu/)
* *Guido Nebiolo* - *Design, Implementation* - [Github](https://github.com/guidonebiolo/), [LinkedIn](https://www.linkedin.com/in/guidonebiolo/)

Thank you for your interest!

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

* Fix architecture schemas
* Inspiration
* etc
