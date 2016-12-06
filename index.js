
'use strict';
/* Library for getting datetime
   npm install date-utils
*/
require('date-utils');

/* Should update aws-sdk to the latest since lambda aws-sdk is not supporting Polly yet.
   npm install aws-sdk@2.7.10
*/
const AWS = require('aws-sdk');
const qs = require('querystring');
const kmsEncryptedToken = process.env.kmsEncryptedToken;
let token;

var polly = new AWS.Polly({apiVersion: '2016-06-10'});
var s3 = new AWS.S3({apiVersion: '2006-03-01'});



function processEvent(event, callback) {
    const params = qs.parse(event.body);
    const requestToken = params.token;
    if (requestToken !== token) {
        console.error(`Request token (${requestToken}) does not match expected`);
        return callback('Invalid request token');
    }

    // params from Slack
    const user = params.user_name;
    const command = params.command;
    const channel = params.channel_name;
    const commandText = params.text;

    // Polly default settting and text message from slack
    const pollyParams = {
      OutputFormat: 'mp3', // Audio Format
      Text: commandText, // Received message from Slack
      VoiceId: 'Emma', // Voice of Polly. Emma is UK English.
      TextType: 'text'
    };

    // Convert text data to audio data
    polly.synthesizeSpeech(pollyParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else
          console.log(data);           // successful response
          // date now
          var dt = new Date();
          var timenow = dt.toFormat("YYYYMMDDHH24MISS");

          // params for S3 to put
          var s3Params = {
            ACL: 'public-read', //S3 Authentication Previledge
            Bucket: 'YOUR-BACKET', // S3 Backet where you want to upload
            Key: `YOUR-FILE${timenow}.mp3`, // New Audio File name
            Body: new Buffer(data.AudioStream) // AudioStream Data
          };

          // upload the data to S3
          s3.putObject(s3Params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
            // Slackにコールバック
            callback(null, `Hi, ${user}. I read your text and recorded my voice at https://s3.amazonaws.com/${s3Params.Buket}/${s3Params.Key} The original text is "${commandText}"`);

          });
    });

}

// Lambda Blueprint for slack. Use this as it is.
exports.handler = (event, context, callback) => {
    const done = (err, res) => callback(null, {
        statusCode: err ? '400' : '200',
        body: err ? (err.message || err) : JSON.stringify(res),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (token) {
        // Container reuse, simply process the event with the key in memory
        processEvent(event, done);
    } else if (kmsEncryptedToken && kmsEncryptedToken !== '<kmsEncryptedToken>') {
        const cipherText = { CiphertextBlob: new Buffer(kmsEncryptedToken, 'base64') };
        const kms = new AWS.KMS();
        kms.decrypt(cipherText, (err, data) => {
            if (err) {
                console.log('Decrypt error:', err);
                return done(err);
            }
            token = data.Plaintext.toString('ascii');
            processEvent(event, done);
        });
    } else {
        done('Token has not been set.');
    }
};
