/*
 * Web page router and program logic
 */

const { faker } = require('@faker-js/faker');

module.exports = function(app, mongoClient) {

	app.get('/', home);
	app.post('/', home);
	
	function home(request, res) {	// Home page

		res.render('index');
	}

	app.get('/shop_catalog', catalog);
	app.post('/shop_catalog', catalog);
	
	async function catalog(request, res) {	// Shop Catalog
		
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			
			console.error('db was null!');
			
			return res.redirect('error');
		}
	
		console.log('Database connection successful');
	
		// Get all items from the database
		let inputFilter = {}
		let outputFilter = {'_id':0,'itemID':0,'name':1,'price':1,'description':1,'quantity':1};
		await getItems(db, inputFilter, outputFilter).then((result) => {

			if (result.messages.success && result.items) {

				let items = result.items

				console.log('Query completed');
				console.log(items);
	
				// Render catalog with retrieved item data
				res.render('shop_catalog', { items });

			} else {

				console.error('Database query failed!');
				console.error(err);
				return res.redirect('error');
			}
			
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});
	};
	
	app.post('/generate_data', function(request, res) {	// Fake Data Generation
	
		let db = mongoClient.db('shopDB');
	
		if (!db) {

			console.error('db was null!');
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
				imageURL:faker.image.url({width: 225, height: 225}),
				quantity:faker.number.int({min: 1, max: 10})
			};

			// Insert into items table
			addItem(db, item).then((result) => {

				if (!result.messages.success) {

					console.log(result.messages.txt);
					return res.redirect('error');
				}
				else {

					console.log(result.messages.txt);
				}

				res.render('fake_data');
			})
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});
	});

	app.post('/add_to_cart', async function(request, res) {	// Add to Cart

		// Get cookie data
		sessionData = request.session;

		// Create guest user with cart if one does not already exist
		if (sessionData.user == null) {

			console.log('Creating new guest user');

			sessionData.user = {};
			sessionData.user.username = 'Guest User';
			// sessionData.user.id = 
			sessionData.user.cart = [];
		}

		// If an item ID exists in the request body, attempt to add it to the user's cart
		if (request.body.itemID) {

			let itemID = parseInt(request.body.itemID);

			// Reset the itemID if it is not a number or less than 0, to prevent issues with data tampering
			if (!itemID || itemID < 0) itemID = 0;

			let db = mongoClient.db('shopDB');
	
			if (!db) {

				console.error('db was null!');
				return res.redirect('error');
			}
	
			console.log('Database connection successful.');

			let queryFilter = {itemID:itemID};
			let resultFilter = {'_id':0,'itemID':1,'name':0,'price':0,'description':0,'quantity':1};

			let item = {};

			// Get the current quantity of the selected item from the database
			await getOneItem(db, queryFilter, resultFilter).then((result) => {

				if (result.messages.success && result.item) {

					console.log('Query completed');

					item = result.item;
					console.log(item);

					// Verify that the item's quantity is greater than 0 before allowing the user to add the item to their cart
					// The "Add Item" button should be hidden on items that are out of stock, but the stock could have changed while the user was viewing the page
					if (item.quantity > 0) {

						let userCart = sessionData.user.cart;

						console.log(`Selected Item: ${itemID}`);

						let itemExists = false;
						for (let i = 0; i < userCart.length; i++) {

							if (userCart[i].itemID == itemID) {

								userCart[i].quantity++;
								itemExists = true;
								break;
							}
						}

						// Add new item to cart if it was not found
						if (!itemExists) {

							let item = {};
							item.itemID = itemID;
							item.quantity = 1;
							sessionData.user.cart.push(item);
						}

						console.log('Items in cart:');
						console.log(userCart);

						// Return to the home page upon successful cart addition
						return res.render('index');
					}
					else {
						let error = { message:"We've run into an issue and were unable to add the selected item to your cart. Please try again later." };
						return res.render('error', { error });
					}
				} else {

					console.error('Database query failed!');
					console.error(err);
					return res.redirect('error');
				}
				
			}, (err) => {

				console.error('Database query failed!');
				console.error(err);
				return res.redirect('error');
			});
		}
	});

	app.post('/remove_from_cart', async function(request, res) {	// Remove from Cart

		// Get cookie data
		sessionData = request.session;

		// Create guest user with cart if one somehow does not already exist
		if (sessionData.user == null) {

			console.log('Creating new guest user');

			sessionData.user = {};
			sessionData.user.username = 'Guest User';
			// sessionData.user.id = 
			sessionData.user.cart = [];
		}

		// Remove selected item from the user's cart, or decrement it if there are more than one
		if (request.body.itemID) {

			let itemID = parseInt(request.body.itemID);
			let userCart = sessionData.user.cart;

			// Reset the itemID if it is not a number or less than 0, to prevent issues with data tampering
			if (!itemID || itemID < 0) itemID = 0;

			// Find the item in the user's cart
			let selectedItem = userCart.find((i) => i.itemID == itemID);

			// Check if the item exists in the cart
			if (selectedItem) {

				// Decrement item's quantity
				selectedItem.quantity -= 1;

				if (selectedItem.quantity <= 0) {

					console.log('Removing item from cart');
					console.log(selectedItem);

					// Remove item from cart
					sessionData.user.cart.splice(userCart.indexOf(selectedItem), 1);
				}

			}
			else {

				console.error('Item could not be found in cart!');
			}

			res.redirect('view_cart');
		}
	});

	app.get('/view_cart', viewCart);
	app.post('/view_cart', viewCart);

	async function viewCart(request, res) {	// View the user's cart

		// User data
		sessionData = request.session;

		// Create guest user with cart if one does not already exist
		if (sessionData.user == null) {

			console.log('Creating new guest user');

			sessionData.user = {};
			sessionData.user.username = 'Guest User';
			// sessionData.user.id = 
			sessionData.user.cart = [];
		}
		
		// Connect to database to retrieve most up-to-date item information
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			
			console.error('db was null!');
			
			return res.redirect('error');
		}
	
		console.log('Database connection successful');
	
		// Get items from the database which the user has in their cart
		let userCart = sessionData.user.cart;
		let selectedItemIDs = userCart.map(i => i.itemID);

		console.log(selectedItemIDs);

		let queryFilter = {itemID:{$in:selectedItemIDs}};
		let resultFilter = {'_id':0,'itemID':1,'name':1,'price':1,'description':1,'quantity':0};

		let items = [];

		await getItems(db, queryFilter, resultFilter).then((result) => {

			if (result.messages.success && result.items) {

				console.log('Query completed');

				items = result.items;
				console.log(items);

				// Add user cart quantity to each item
				for (let c = 0; c < userCart.length; c++) {

					for (let i = 0; i < items.length; i++) {

						if (userCart[c].itemID == items[i].itemID) {

							items[i].quantity = userCart[c].quantity;
						}
					}
				}

			} else {

				console.error('Database query failed!');
				console.error(err);
				return res.redirect('error');
			}
			
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});

		// Send cart data to the viewing page
		let data = { 'items':items };
		res.render('view_cart', { data });
	}

	app.get('/check_out', checkout);
	app.post('/check_out', checkout);

	async function checkout(request, res) {	// Shopping cart checkout

		// User data
		sessionData = request.session;

		// Create guest user with cart if one does not already exist
		if (sessionData.user == null) {

			console.log('Creating new guest user');

			sessionData.user = {};
			sessionData.user.username = 'Guest User';
			// sessionData.user.id = 
			sessionData.user.cart = [];
		}

		// Connect to database to retrieve most up-to-date item information
		let db = mongoClient.db('shopDB');
	
		if (!db) {
			
			console.error('db was null!');
			
			return res.redirect('error');
		}
	
		console.log('Database connection successful');
	
		// Get items from the database which the user has in their cart
		let userCart = sessionData.user.cart;
		let selectedItemIDs = userCart.map(i => i.itemID);

		console.log(selectedItemIDs);

		let queryFilter = {itemID:{$in:selectedItemIDs}};
		let resultFilter = {'_id':0,'itemID':1,'name':1,'price':1,'description':1,'quantity':0};

		let items = [];

		await getItems(db, queryFilter, resultFilter).then(async (result) => {

			if (result.messages.success && result.items) {

				console.log('Query completed');

				items = result.items
				console.log(items);

				// Adjust item quantities/remove items from the cart if needed based on quantity available in the database
				let altered = false;
				for (let c = 0; c < userCart.length; c++) {

					for (let i = 0; i < items.length; i++) {

						// Match items by ID
						if (userCart[c].itemID == items[i].itemID) {

							// Mark whether or not any changes will be made to the cart
							if (userCart[c].quantity > items[i].quantity) altered = true;

							// Set item quantity to the minimum between the requested quantity and available item quantity
							items[i].quantity = Math.min(items[i].quantity, userCart[c].quantity);
						}
					}
				}

				// Item objects that will be kept in the cart (quantity > 0)
				let filteredItems = items.filter((i) => i.quantity > 0);

				// Clear the cart and checkout if no alterations were made, otherwise alter the cart and inform the user
				sessionData.user.cart = [];
				if (!altered) {

					let filter = {'itemID':{$in:filteredItems}};

					await checkoutItems(db, filteredItems).then((result) => {

						if (!result.messages.success) {

							console.log(result.messages.txt);
							return res.redirect('error');
						}
						
						return res.render('check_out');
					});

				} else {

					// Re-add only the valid items to the cart
					sessionData.user.cart = filteredItems;

					// Items that have been removed from the cart
					let removedItems = items.filter((i) => i.quantity == 0);

					let data = { 
						'items':filteredItems,
						'removedItems':removedItems,
						'info':'Sorry, we do not have enough of each item to meet your order. Quantities in your shopping card have been adjusted to meet our current stock, and/or items have been removed.'
					};
					return res.render('view_cart', { data });
				}

			} else {

				console.error('Database query failed!');
				console.error(err);
				return res.redirect('error');
			}
			
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});
	}
	
	app.get('/error', showError);
	app.post('/error', showError);

	function showError(request, res) {	// Error page
		
		res.render('error');
		console.log('User redirected to /error');
	}

	/* Database Functions */


	// Item lookup
	async function getItems(db, queryFilter, resultFilter) {

		let items = [];

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			let cursor = db.collection('items').find(queryFilter, resultFilter, queryOptions);
			await executeQueryCursor(cursor).then((result) => {
		
				items = result;
			}, (err) => {

				messages.txt = 'Database query failed!';
				throw(err);
			});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Database lookup complete';
			messages.success = true;
		}
		catch (error) {

			console.error(error);
			messages.success = false;

			// Cancel transaction
			await session.abortTransaction();
		}

		// End of session
		session.endSession();
		return { messages, items };
	}

	async function getOneItem(db, queryFilter, resultFilter) {

		let item = {};

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			await db.collection('items').findOne(queryFilter, resultFilter, queryOptions).then((result) => {
		
				item = result;
			}, (err) => {

				messages.txt = 'Database query failed!';
				throw(err);
			});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Database lookup complete';
			messages.success = true;
		}
		catch (error) {

			console.error(error);
			messages.success = false;

			// Cancel transaction
			await session.abortTransaction();
		}

		// End of session
		session.endSession();
		return { messages, item };
	}

	// Item document insert
	async function addItem(db, item) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session, returnOriginal: false, upsert: true };

			console.log(item);
			await db.collection('items').replaceOne(
				{'itemID':item.itemID}, 
				item, 
				queryOptions
			).then(() => {}, (err) =>  {

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
		return { messages };
	}

	// Remove the specified quantity from items that fit the given filter
	async function checkoutItems(db, items) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			// Loop over each item to verify it exists and meets the quantity requirements, and update its quantity
			for (let i = 0; i < items.length; i++) {

				let queryFilter = { 'itemID':items[i].itemID };
				await (getOneItem(db, queryFilter, {'_id':0,'itemID':0,'name':0,'price':0,'description':0,'quantity':1})).then(
					async (result) => {

						if (!result.item || !result.messages.success) {

							messages.txt = `Failed to select item id ${items[i].itemID} during checkout`;
							throw new Error(messages.txt);
						}

						let item = result.item;

						// Verify the requested quantity is not greater than the available quantity
						if (item.quantity < items[i].quantity) {

							messages.txt = `Invalid item quantity found during checkout`;
							throw new Error(messages.txt);
						}

						// Update the item's quantity by subtracting the shopping cart item's quantity from the item in the database
						await db.collection('items').updateOne(
							{'itemID':items[i].itemID}, 
							{$set: {'quantity':item.quantity - items[i].quantity}}, 
							queryOptions
						).then(() => { console.log(`Successfully updated item with id ${items[i].itemID}`) }, 
						(err) => {

							if (err) {

								messages.txt = 'Error updating item in database';
								throw err;
							}
						});
					}, 
					(err) => { 

					messages.txt = `Failed to select item id ${items[i].itemID} during checkout`;
					throw err;
				})
			}

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Item successfully updated';
			messages.success = true;
		}
		catch (error) {

			console.error(error);
			messages.success = false;

			// Cancel transaction
			await session.abortTransaction();
		}

		// End of session
		session.endSession();
		return { messages };
	}
	
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