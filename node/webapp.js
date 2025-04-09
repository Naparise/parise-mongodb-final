const http = require('http');
const path = require('path');
const test = require('assert');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');


const url = 'mongodb://localhost';
const port = 3000;
const app = express();

const resPath = path.join(__dirname, 'public');

app.set('view engine', 'ejs')
app.set('views', path.join(resPath, 'views'));

app.use(bodyParser.urlencoded({extended: false}));	// Argument parsing tool setup
app.use(bodyParser.json());

// Public resource directory
app.use(express.static(resPath));

// Create connection with the mongoDB server, using a connection pool of 10 and an initial timeout of 10 seconds
mongoClient = new MongoClient(url, {maxPoolSize: 10, serverSelectionTimeoutMS:10000});

app.get('/', function(request, res) {	// Home page

	res.render('index');
});




// Listen for server connection
var server = app.listen(port, function() {

	connectAndRun();
});		


/* Misc Functions */

// Connect to the mongodb server
async function connectAndRun() {

	console.log('Connecting to local MongoDB Server...');
	await mongoClient.connect().then(() => {console.log('Connected!')}, () => {console.error("Connection error! Is the MongoDB server running?")});
}