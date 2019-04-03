export class StaticWebsiteConfig {
  config: any;
  constructor() {
    this.config = {
      "Parameters": {
        "HostedZoneId": {
          "Type": "AWS::Route53::HostedZone::Id",
          "Description": "The ID of the public Hosted Zone which handle the domain."
        },
        "DomainName": {
          "Type": "String",
          "Description": "The domain for the website i.e. www.example.com"
        },
        "CodeBuildImage": {
          "Type": "String",
          "Default": "aws/codebuild/ubuntu-base:14.04"
        },
        "CDNCertificateArn": {
          "Type": "String",
          "Description": "Enter SSL Certificate Arn. It must be created in N. Virginia region."
        },
        "CDNPriceClass": {
          "Type": "String",
          "Default": "PriceClass_100",
          "AllowedValues": [
            "PriceClass_100",
            "PriceClass_200",
            "PriceClass_All"
          ],
          "Description": "Enter PriceClass_100, PriceClass_200, or PriceClass_All. Default is PriceClass_100. https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_DistributionConfig.html"
        }
      }
    }
  }
}
