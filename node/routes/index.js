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
			addItem(db, item).then((result) => {

				if (!result.success) {

					console.log(result.txt);
					return res.redirect('error');
				}
				else {

					console.log(result.txt);
				}

				res.render('fake_data');
			})
		}, (err) => {

			console.log("Database query failed!");
			console.error(err);
			return res.redirect('error');
		});
	});

	app.get('error', showError);
	app.post('error', showError);

	function showError(request, res) {

		res.render('error');
	}

	/* Misc Functions */

	// Retrieve information from a database cursor and store the results in a list
	async function executeQueryCursor(cursor) {

		let data = [];

		await cursor.forEach((record) => {

			data.push(record);
		})

		return data;
	}

	// Insert item(s) into the database using transactions
	async function addItem(db, item) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = {session, returnOriginal: false, upsert: true};

			console.log(item);
			await db.collection('items').replaceOne({'itemID':item.itemID}, item, queryOptions).then(() => {}, (err) =>  {

				if (err) { 

					messages.txt = 'Error inserting item into database';
					throw err; 
				}
			});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Item insert complete';
			messages.success = true;
		}
		catch (error) {

			console.log(error);
			messages.success = false;

			// Cancel transaction
			await session.abortTransaction();
		}

		// End of session
		session.endSession();
		return messages;
	}

	return app;
}