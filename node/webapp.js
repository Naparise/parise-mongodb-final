/*
 * Application entrypoint
 */

const http = require('http');
const path = require('path');
const test = require('assert');

const express = require('express');
const bodyParser = require('body-parser');

const routes = require('./routes');
const initDatabases = require('./dbs');

const app = express();
app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({extended: false}));	// Argument parsing tool setup
app.use(bodyParser.json());


// Public resource directory
const resPath = path.join(__dirname, 'public');
app.use(express.static(resPath));

// Views directory
app.set('views', path.join(resPath, 'views'));


// Database port
const port = 3000;

initDatabases().then((db) => {

	console.log('Connected!')

	// Get connection to database
	var mongoClient = db.production;

	// Link to routing code
	var application = routes(app, mongoClient);

	var server = application.listen(port, async function() {});
},
() => {

	console.error('Connection error! Is the MongoDB server running?');

	// Quit if a database connection could not be established
	process.exit(1);
});