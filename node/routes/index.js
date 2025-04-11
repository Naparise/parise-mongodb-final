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
		}, (err) => {

			console.log("Database query failed!");
			console.error(err);
			res.redirect('error');
		});
	});
	
	app.post('/generate_data', function(request, res) {	// Fake Data Generation
	
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			console.log('db was null!');
	
			
			return res.redirect('error');
		}
	
		console.log('Database connection successful. Generating data...');

		let cursor = db.collection('items').find({}, {});
		executeQueryCursor(cursor).then((items) => {

			// Create item with random data
			let item = {
				itemID:items.length,
				name:faker.commerce.productName(), 
				price:faker.commerce.price(),
				description:faker.commerce.productDescription(),
				imageURL:faker.image.url({width: 225, height: 225})
			};

			// Insert into items table
			db.collection('items').replaceOne({'itemID':item.itemID}, item, {upsert: true}).then(() => {

				console.log('Document inserted successfully');
				
				res.render('fake_data');
			}, (err) =>  {

				if (err) { 

					res.redirect('error');
					throw err; 
				}
			});
		}, (err) => {

			console.log("Database query failed!");
			console.error(err);
			return res.redirect('error');
		});
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