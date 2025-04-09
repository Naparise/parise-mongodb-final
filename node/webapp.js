const http = require('http');
const MongoClient = require('mongodb').MongoClient;
const express = require('express');
const bodyParser = require('body-parser');

const test = require('assert');

const url = 'mongodb://localhost';
const port = 3000;

const app = express();
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: false}));	// Argument parsing tool setup
app.use(bodyParser.json());

// Create connection with the mongoDB server, using a connection pool of 10 and an initial timeout of 10 seconds
mongoClient = new MongoClient(url, {maxPoolSize: 10, serverSelectionTimeoutMS:10000});

app.get('/', function(request, res) {	// Home page

	res.render('index');
});