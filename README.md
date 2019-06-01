# immutable.templates

Immutable templates contains a collection of CDK templates. The respective CloudFormation templates will be stored in [here](https://github.com/GuidoNebiolo/aws-architectures) as soon as they will be ready to be shipped.

## Available Arhictectures
The available architectures are the following:

- [Static Website](https://github.com/made2591/immutable.templates/blob/master/templates/static-website/README.md): this stack creates a static site hosted on [Amazon S3](https://aws.amazon.com/s3/), served throught the help of [Cloudfront](https://aws.amazon.com/cloudfront/) and shipped with CI/CD powered by [Codepipeline](https://aws.amazon.com/codepipeline/)
- [Contact Form](https://github.com/made2591/immutable.templates/blob/master/templates/contact-form/README.md): todo
- [Upload Form](https://github.com/made2591/immutable.templates/blob/master/templates/upload-form/README.md): todo
- [Producer/Consumer](https://github.com/made2591/immutable.templates/blob/master/templates/producer-consumer/README.md): todo
- [Document Reader](https://github.com/made2591/immutable.templates/blob/master/templates/document-reader/README.md): todo

## Getting Started

To use the stack and modify them, just clone the repository and move to the desired stack folder under the `templates` directory in the root of the repository. For example, if you are interested in the static-website stack, just do the following:

```
git clone https://github.com/made2591/immutable.templates
cd immutable.templates/templates/static-website
# start deploy (see later)
```

You will find an always updated list of the current available stacks in the section Available Arhictectures of this document.

### Prerequisites

The only needed tool is [Node.js](https://nodejs.org/en/download/) - ≥ 8.11.x - and the [AWS Cloud Development Kit](https://github.com/awslabs/aws-cdk) - AWS CDK. You can install it by running

```
$ npm i -g aws-cdk
```

## Deployment of Stacks
Just as any other CDK stack, this are the main commands that can help you with the most common actions:

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

## Built With

* [Node.js](https://nodejs.org/en/download/) - Node.js
* [AWS CDK](https://github.com/awslabs/aws-cdk) - AWS Cloud Development Kit
* [AWS SAM](https://github.com/awslabs/serverless-application-model) - AWS Serverless Application Model

## Contributing

Please read [CONTRIBUTING.md](https://github.com/made2591/immutable.templates/CONTRIBUTING.md) for details on how to contact me.

## Authors

* **Matteo Madeddu** - *Design, Implementation* - [Github](https://github.com/made2591/), [LinkedIn](https://www.linkedin.com/in/mmadeddu/)
* *Guido Nebiolo* - *Design, Implementation* - [Github](https://github.com/guidonebiolo/), [LinkedIn](https://www.linkedin.com/in/guidonebiolo/)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

* Fix architecture schemas
* Inspiration
* etc
