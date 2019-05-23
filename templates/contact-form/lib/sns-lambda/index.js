// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

const snstopic = process.env.TOPIC_ARN
const region = process.env.REGION || 'eu-west-1'
AWS.config.update({region: region});

function formatMessage(infos) {
    // console.log(infos)
    return 'Name: ' + infos.NewImage.name.S + '\n' +
        'Email: ' + infos.NewImage.email.S + '\n' +
        'Message: ' + infos.NewImage.content.S + '\n'
}

exports.handler = function(event, context, callback) {
    // console.log(JSON.stringify(event, null, 2));
    event.Records.forEach(function(record) {
        console.log(record.eventID);
        // console.log(record.eventName);
        // console.log('DynamoDB Record: %j', record.dynamodb);
        var publishTextPromise = new AWS.SNS({apiVersion: '2010-03-31'}).publish(
            {
                Message: formatMessage(record.dynamodb),
                TopicArn: snstopic
            }
        ).promise();
        publishTextPromise.then(
            function(data) {
                // console.log("Message send sent to the topic {snstopic}");
                console.log("MessageID is " + data.MessageId);
            }).catch(
                function(err) {
                console.error(err, err.stack);
            }
        );
    });
    callback(null, "message"); 
};