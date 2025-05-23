/*
 * Application entrypoint
 */

const http = require('http');
const path = require('path');
const test = require('assert');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const routes = require('./routes');
const initDatabases = require('./dbs');

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: false}));	// Argument parsing tool setup
app.use(bodyParser.json());

const DEFAULT_SECRET = 'XCR3rsasa%RDHHH';

app.use(session({
	resave: true, 
	saveUninitialized: true, 
	secret: process.env.COOKIE_SECRET ? process.env.COOKIE_SECRET : DEFAULT_SECRET, 
	cookie: { maxAge: 600000} // 10 minutes
}));


// Public resource directory
const resPath = path.join(__dirname, 'public');
app.use(express.static(resPath));

// Views directory
app.set('views', path.join(resPath, 'views'));


// Database port
const port = 3000;

initDatabases().then((client) => {

	console.log('Connected!')

	// Get connection to database
	var mongoClient = client.production;

	// Link to routing code
	var application = routes(app, mongoClient);

	var server = application.listen(port, async function() {});
},
() => {

	console.error('Connection error! Is the MongoDB server running?');

	// Quit if a database connection could not be established
	process.exit(1);
});