/*
 * Web page router and program logic
 */

const { faker } = require('@faker-js/faker');

module.exports = function(app, mongoClient) {

	app.get('/', home);
	app.post('/', home);
	
	function home(request, res) {

		res.render('index');
	}
	
	app.post('/shop_catalog', function(request, res) {	// Shop Catalog
		
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			
			console.log('db was null!');
	
			res.redirect('error');
			return;
		}
	
		console.log('Database connection successful');
	
		// Get all items from the database
		let cursor = db.collection('items').find({}, {_id:0,'itemID':0,'name':1,'price':1,'description':1});
		executeQueryCursor(cursor).then((items) => {
	
			console.log("Query completed");
			
			console.log(items);
	
			// Render catalog with retrieved item data
			res.render('shop_catalog', {items});
		});
	});

	var idCounter = 0;
	
	app.post('/generate_data', function(request, res) {	// Fake Data Generation
	
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			console.log('db was null!');
	
			res.redirect('error');
			return;
		}
	
		console.log('Database connection successful. Generating data...');

		// Create item with random data
		let item = {
			itemID:idCounter++, 
			name:faker.commerce.productName(), 
			price:faker.commerce.price(),
			description:faker.commerce.productDescription()
		};

		// Insert into items table
		db.collection('items').replaceOne({'itemID':item.itemID}, item, {upsert: true}, function(err, res) {

			if (err) { 

				res.redirect('error');
				throw err; 
			}
			else { 

				console.log('Document inserted successfully'); 
			}
		});
	
		res.render('fake_data');
	});

	/* Misc Functions */

	// Retrieve information from a database cursor and store the results in a list
	async function executeQueryCursor(cursor) {

		let data = [];

		await cursor.forEach((record) => {

			data.push(record);
		})

		return data;
	}

	

	return app;
}