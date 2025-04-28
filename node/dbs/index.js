/*
 * Database connection manager
 */

const MongoClient = require('mongodb').MongoClient
const url = 'mongodb://localhost/shopDB';	// Creates shopDB if it doesn't already exist

function connect() {

	console.log('Connecting to Database...');

	// Connect with the mongoDB server, using a connection pool of 10 and connection timeout of 10 seconds
	return MongoClient.connect(url, { maxPoolSize: 10, 
		serverSelectionTimeoutMS:10000});
}

module.exports = async function() {

	let clients = await Promise.all([connect()]);
	return { production: clients[0] };
}