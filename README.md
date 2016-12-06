# slack-lambda-polly
Polly integration with Slack using Lambda(NodeJS). You can see details at [qiita](http://qiita.com/ShotaKameyama/items/28cf3f33a658c6fbac74)
AWS Lambda current aws-sdk is not supporting Polly. Therefore, you need to upload current aws-sdk by yourself.

Zip your files including library and upload to Lambda.

```
zip -r myfunc.zip index.js node_modules
```
