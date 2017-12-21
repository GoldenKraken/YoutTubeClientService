const express = require('express');
const app = express();
var client = require('./connection.js');
app.use(require('express-status-monitor')());
var Elasticsearch = require('winston-elasticsearch');
var winston = require('winston'),
    expressWinston = require('express-winston');
var bodyParser = require('body-parser');
var axios = require('axios');
const Consumer = require('sqs-consumer');
var AWS = require('aws-sdk');
var keys = require('./AWS.js');
AWS.config.update({
  region: 'us-west-2',
  accessKeyId: keys.aws_access_key_id,
  secretAccessKey: keys.aws_secret_access_key
});
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

app.use(expressWinston.logger({
  transports: [
    new Elasticsearch({level:'info'})
  ]
}));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/search/:term', (req, res) => {
	//Possibly come back and parse down how much data is sent to client.
	res.status(200);
	var searchTerm = req.params.term;

	client.search({
	  index: 'video',
	  type: 'uploaded',
	  body: {
	    query: {
		  fuzzy: {
		    "snippet.title": searchTerm
     	  }
        }
      }
	}).then(function (body) {
	  var hits = body.hits.hits;
	  res.send(hits);
	}, function (error) {
	  console.trace(error.message);
	  res.send('error!')
	});

})

app.get('/video/:id', (req, res) => {
	//Sends back a single video based on the ID, should be sent after user picks specific video in client.
	res.status(200);
	var searchTerm = req.params.id;

	client.search({
	  index: 'video',
	  type: 'uploaded',
	  body: {
	    query: {
		  match: {
		    "video_url_id": searchTerm
     	  }
        }
      }
	}).then(function (body) {
	  var hits = body.hits.hits;
	  res.send(hits);
	}, function (error) {
	  console.trace(error.message);
	  res.send('error!')
	});

})


const findVideos = Consumer.create({
  queueUrl: 'https://sqs.us-west-2.amazonaws.com/867486098166/Uploads',
  handleMessage: (message, done) => {
    var inputVideo = JSON.parse(message.Body)
    console.log(inputVideo)
   	client.index({  
	  index: 'video',
	  type: 'uploaded',
	  body: inputVideo })
	  res.send('Sent');
    done();
  },
  sqs: new AWS.SQS()
});
 
findVideos.on('error', (err) => {
  console.log(err.message);
});
 
findVideos.start();

// app.get('newvideos', (req, res) =>{
// 	//Still need to add ability to process body, then upload to elasticsearch.
// 	res.status(200);
// 	axios.get('getfromQueURl')
// 	.then(function (response) {
// 		console.log(response)
// 	.catch(function (error) {
// 	    console.log(error);
// 	    res.send('Error');
// 	});
// })

app.post('/clientEvent', (req, res) =>{
	res.status(201);
	var event = req.body;

var params = {
 DelaySeconds: 10,
 MessageBody: JSON.stringify(req.body),
 QueueUrl: "https://sqs.us-west-2.amazonaws.com/867486098166/ClientEvents"
};

sqs.sendMessage(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data.MessageId);
  }
});


})

app.post('/upload', (req, res) =>{
	res.status(201);
	var uploadObject = req.body;
	console.log(uploadObject);

	var params = {
	 DelaySeconds: 10,
	 MessageBody: JSON.stringify(req.body),
	 QueueUrl: "https://sqs.us-west-2.amazonaws.com/867486098166/Uploads"
	};

	sqs.sendMessage(params, function(err, data) {
	  if (err) {
	    console.log("Error", err);
	  } else {
	    console.log("Success", data.MessageId);
	  }
	});

})

app.listen(3000, () => console.log('Example app listening on port 3000!'))

