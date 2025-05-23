/*
 * Web page router and program logic
 */

const { faker } = require('@faker-js/faker');
const date = require('date-and-time');

module.exports = function(app, mongoClient) {

	app.get('/', entry);
	app.post('/', entry);

	function entry(request, res) {	// Redirect to login or home

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}

		res.redirect('/home');
	}

	app.get('/login_register', loginPage);
	app.post('/login_register', loginPage);

	async function loginPage(request, res) {

		res.render('login_register');
	}

	app.post('/login', handleLoginRequest);

	async function handleLoginRequest(request, res) {	// Login request

		// Get cookie data
		sessionData = request.session;

		let username = request.body.username;
		let db = establishDBConnection();

		if (!db) return;
		
		// Find user in database
		let inputFilter = { 'username':username };
		let outputFilter = { '_id':0,'userID':1,'username':1 };
		await getOneUser(db, inputFilter, outputFilter).then((result) => {

			if (result.messages.success && result.user) {

				let user = result.user

				console.log('Query completed');
				console.log(user);

				// Add user to session
				sessionData.user = {};
				sessionData.user.userID = user.userID;
				sessionData.user.username = user.username;
				sessionData.user.cart = [];

				res.redirect('/');

			} else {

				console.error('User could not be logged in');
				let error = { 'message':'Unable to find a user by that username.' };
				return res.render('error', { error });
			}
			
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});
	}

	app.post('/register', handleRegisterRequest);

	async function handleRegisterRequest(request, res) { // User registration

		// Get cookie data
		sessionData = request.session;

		let username = request.body.username;

		let db = establishDBConnection();
	
		if (!db) return;
	
		console.log('Database connection successful');
	
		// Check if user already exists in database
		let inputFilter = {'username':username};
		let outputFilter = {'_id':0,'userID':0,'username':1};
		await getOneUser(db, inputFilter, outputFilter).then(async (result) => {

			if (result.messages.success) {

				console.log('Query completed');

				if (result.user) {

					console.log('User already exists');
					let error = { 'message':'A user by that username already exists.' };
					return res.render('error', { error });
				}
				else {

					console.log('Creating new user');
					await getUsers(db, {}, {}).then(
					(result) => {

						if (!result.messages.success) {

							return res.redirect('error');
						}

						if (username.length < 3) {

							let error = { 'message':'Username must be at least 3 characters long.' };
							return res.render('error', { error });
						}

						// Create user with provided username
						let user = {
							'userID':result.users.length,
							'username':username
						};

						// Insert into users table
						addUser(db, user).then((result) => {

							if (!result.messages.success) {

								console.log(result.messages.txt);
								return res.redirect('error');
							}
							else {

								console.log(result.messages.txt);
							}

							sessionData.user = user;
							sessionData.user.cart = [];

							res.redirect('/');
						})
					}, 
					(err) => {

						console.error('Database query failed!');
						console.error(err);
						return res.redirect('error');
					});
				}

			} else {

				console.error('Error reading users from database');
				return res.redirect('error');
			}
			
		}, (err) => {

			console.error('Database query failed!');
			console.error(err);
			return res.redirect('error');
		});
	}

	app.post('/logout', logout);

	function logout(request, res) {

		// Invalidate cookie data
		sessionData = request.session;

		sessionData.user = null;

		res.redirect('login_register');
	}

	app.get('/home', home);
	app.post('/home', home);

	function home(request, res) {	// Home page

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}

		let data = { 'username':sessionData.user.username };
		res.render('index', { data });
	}

	app.get('/shop_catalog', catalog);
	app.post('/shop_catalog', catalog);
	
	async function catalog(request, res) {	// Shop Catalog

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}

		let success = false;
	
		// Get all items from the database
		let items = null;

		let inputFilter = {}
		let outputFilter = { '_id':0,'itemID':0,'name':1,'price':1,'description':1,'quantity':1 };
		await getItems(db, inputFilter, outputFilter).then((result) => {

			if (result.messages.success && result.items) {

				items = result.items
				success = true;

			} else {

				success = false;
				console.error('Catalog query failed!');
			}
			
		}, (err) => {

			success = false;
			console.error('Database query failed!');
			console.error(err);
		});

		if (success) {

			for (let i = 0; i < items.length; i++) {

				await getAverageRating(db, items[i].itemID).then(
				(result) => {

					if (result.messages.success) {

						// let ratingDec = result.rating % 1;				// Decimal portion of the rating
						// let roundedDec = Math.round(ratingDec * 2) / 2;	// Round decimal portion; [0, 0.25) = 0 ; [0.25, 0.75) = 0.5 ; [0.75, 1) = 1
						// let avgRating = Math.floor(result.rating) + roundedDec;

						let avgRating = Math.floor(result.item.rating) + (Math.round(result.item.rating % 1 * 2) / 2);
						items[i].rating = avgRating;
						items[i].numRatings = result.item.numRatings;
					}
					else {

						success = false;
						console.error('Average rating failed for at least one item');
						return;
					}
				}, 
				(err) => {

					if (err) {

						success = false;
						console.error('Average rating failed for at least one item');
						console.err(err);
					}
				});
			}
		}

		// Render catalog with retrieved item data
		if (success) res.render('shop_catalog', { items });
		else return res.redirect('error');
	};
	
	app.post('/generate_data', function(request, res) {	// Fake Data Generation

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}
	
		console.log('Database connection successful. Generating data...');

		let cursor = db.collection('items').find({}, {});
		executeQueryCursor(cursor).then((items) => {

			// Create item with random data
			let item = {
				'itemID':items.length,
				'name':faker.commerce.productName(), 
				'price':parseFloat(faker.commerce.price()),
				'description':faker.commerce.productDescription(),
				'imageURL':faker.image.url({width: 225, height: 225}),
				'quantity':faker.number.int({min: 1, max: 10})
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

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}

		// If an item ID exists in the request body, attempt to add it to the user's cart
		if (request.body.itemID) {

			let itemID = parseInt(request.body.itemID);

			// Reset the itemID if it is not a number or less than 0, to prevent issues with data tampering
			if (!itemID || itemID < 0) itemID = 0;

			let queryFilter = { 'itemID':itemID };
			let resultFilter = { '_id':0,'itemID':1,'name':0,'price':0,'description':0,'quantity':1 };

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

						return res.redirect('/');
					}
					else {
						let error = { 'message':"We've run into an issue and were unable to add the selected item to your cart. Please try again later." };
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

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
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

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}
	
		// Get items from the database which the user has in their cart
		let userCart = sessionData.user.cart;
		let selectedItemIDs = userCart.map(i => i.itemID);

		console.log(selectedItemIDs);

		let queryFilter = { 'itemID':{ $in:selectedItemIDs } };
		let resultFilter = { '_id':0,'itemID':1,'name':1,'price':1,'description':1,'quantity':0 };

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

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}
	
		// Get items from the database which the user has in their cart
		let userCart = sessionData.user.cart;
		let selectedItemIDs = userCart.map(i => i.itemID);

		console.log(selectedItemIDs);

		let queryFilter = { 'itemID':{ $in:selectedItemIDs } };
		let resultFilter = { '_id':0,'itemID':1,'name':1,'price':1,'description':1,'quantity':0 };

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

					await checkoutItems(db, filteredItems, sessionData.user.userID).then((result) => {

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

	app.get('/view_orders', viewOrders);
	app.post('/view_orders', viewOrders);

	async function viewOrders(request, res) {

		// Get cookie data
		sessionData = request.session;

		let db = establishDBConnection();

		if (!db) return;

		if (!sessionData.user || !validateUser(db, sessionData.user.userID)) {

			return res.redirect('login_register');
		}

		console.log(request.body);

		let data = null;
		let orders = null;

		let success;	// Item rating display requires many database interactions
						// A single boolean is used to determine the overall success of these interactions

		let queryFilter = { 'userID':sessionData.user.userID };
		await getOrders(db, queryFilter, {}).then(
		(result) => {

			if (!result.messages.success) {

				success = false;
				return;
			}

			orders = result.orders;

			data = { 'orders':orders };
			console.log(data);

			success = true;
		}, 
		(err) => {

			console.error('Database query failed!');
			console.error(err);
			success = false;
			return;
		})

		
		// Get potential rating submission
		if (success && request.body.ratingInfo && request.body.rating) {

			let ratingInfo = JSON.parse(request.body.ratingInfo);
			let rating = parseFloat(request.body.rating[ratingInfo.ratingIndex]);

			// Ensure the provided rating is within correct bounds, otherwise redirect the user
			if (rating < 1 || rating > 5) {

				let error = { 'message':'Invalid rating. Please try again.' };
				return res.render('error', { error });
			}

			let order = null;
			let item = null;

			let found = false;

			let itemCounter = 0;
			
			// Find the particular order and item associated with the rating
			for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {

				for (let itemIndex = 0; itemIndex < orders[orderIndex].items.length; itemIndex++) {

					if (itemCounter == ratingInfo.ratingIndex) {

						order = orders[orderIndex];
						item = order.items[itemIndex];
						found = true;
						break;
					}

					itemCounter++;
				}

				if (found) break;

			}

			if (order && item) {

				console.log(`User gave a rating of ${rating} stars on order ${ratingInfo.orderIndex} (id=${order._id}) item ${ratingInfo.itemIndex} (id=${item.itemID})`);

				// Add the item rating to the database
				await rateOrderItem(db, order._id, item.itemID, rating).then(
				(result) => {
	
					if (!result.messages.success) {
	
						success = false;
						return;
					}
	
					// Just update the rating the item in the data object instead of pulling down the order/item from the database again
					data.orders[ratingInfo.orderIndex].items[ratingInfo.itemIndex].rating = rating;
				}, 
				(err) => {
	
					console.error('Database query failed!');
					console.error(err);
					success = false;
					return;
				});
			}
		}

		if (success) return res.render('view_orders', { data });
		else return res.redirect('error');
	}

	app.get('/:url', routeAny);
	
	function routeAny(request, res) {

		return res.redirect('/');
	}

	/* Database User Functions */

	async function validateUser(db, userID) {

		let success = false;

		await getOneUser(db, { 'userID':userID }, { _id:0, userID:1, username:0 }).then(
		(result) => {

			if (result.messages.success && result.user && result.user.userID == userID)
			{
				success = true;
			}
		},
		(err) => {

			console.log('Error retrieving user from database');
		});

		return success;
	}

	// Get users given a query and result filter
	async function getUsers(db, queryFilter, resultFilter) {

		let users = [];

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			let cursor = db.collection('users').find(queryFilter, resultFilter, queryOptions);
			await executeQueryCursor(cursor).then((result) => {
		
				users = result;
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
		return { messages, users };
	}

	// Get a single user given a query and result filter
	async function getOneUser(db, queryFilter, resultFilter) {

		let user = {};

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			await db.collection('users').findOne(queryFilter, resultFilter, queryOptions).then((result) => {
		
				user = result;
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
		return { messages, user };
	}


	// User document insert
	async function addUser(db, user) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session, returnOriginal: false, upsert: true };

			console.log(user);
			await db.collection('users').replaceOne(
				{'userID':user.userID}, 
				user, 
				queryOptions
			).then(() => {}, (err) =>  {

				if (err) { 

					messages.txt = 'Error inserting user into database';
					throw err; 
				}
			});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'User insert complete';
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

	/* Database Item Functions */

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

	// Remove the specified quantity from items that fit the given filter and add them to a new order
	async function checkoutItems(db, items, userID) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			// Loop over each item to verify it exists and meets the quantity requirements, and update its quantity
			items.forEach(async (item) => {

				let queryFilter = { 'itemID':item.itemID };
				await (getOneItem(db, queryFilter, {'_id':0,'itemID':0,'name':0,'price':0,'description':0,'quantity':1})).then(
					async (result) => {

						if (!result.item || !result.messages.success) {

							messages.txt = `Failed to select item id ${item.itemID} during checkout`;
							throw new Error(messages.txt);
						}

						// Verify the requested quantity is not greater than the available quantity
						if (result.item.quantity < item.quantity) {

							messages.txt = `Invalid item quantity found during checkout`;
							throw new Error(messages.txt);
						}

						// Update the item's quantity by subtracting the shopping cart item's quantity from the item in the database
						await db.collection('items').updateOne(
							{ 'itemID':result.item.itemID }, 
							{ $set: { 'quantity':result.item.quantity - item.quantity } }, 
							queryOptions
						).then(() => { console.log(`Successfully updated item with id ${ result.item.itemID }`) }, 
						(err) => {

							if (err) {

								messages.txt = 'Error updating item in database';
								throw err;
							}
						});
					}, 
					(err) => { 

					messages.txt = `Failed to select item id ${item.itemID} during checkout`;
					throw err;
				})
			});			

			// Create a new order object with a unique ID
			await getOrders(db, {}, {}).then(
				async (orders) => {

					let currentDate = new Date();

					let order = {};
					order.userID = userID;
					order.date = date.format(currentDate, 'ddd, MMM DD, YYYY HH:mm:ss');
					order.items = [];

					// Add relevant item details to the order
					items.forEach((item) => {

						let cleanedItem = {};
						
						cleanedItem.itemID = item.itemID;
						cleanedItem.name = item.name;
						cleanedItem.price = item.price;
						cleanedItem.quantity = item.quantity;
						cleanedItem.total = cleanedItem.price * cleanedItem.quantity;
						cleanedItem.rating = -1;

						order.items.push(cleanedItem);
					});

					// Add the order to the database
					await addOrder(db, order).then(
					(result) => {

						if (!result.messages.success) {

							messages.txt = result.messages.txt;
							throw new Error(messages.txt);
						}
					},
					(err) => {

						if (err) {

							messages.txt = result.messages.txt;
							throw err;
						}
					});
				},
				(err) => {

					if (err) {

						messages.txt = 'Error reading orders from database';
						throw err;
					}
				});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Item successfully updated and order created';
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

	/* Database Order Functions */

	// Order lookup
	async function getOrders(db, queryFilter, resultFilter) {

		let orders = [];

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			let cursor = db.collection('orders').find(queryFilter, resultFilter, queryOptions);
			await executeQueryCursor(cursor).then((result) => {
		
				orders = result;
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
		return { messages, orders };
	}

	async function getOneOrder(db, queryFilter, resultFilter) {

		let order = {};

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			await db.collection('orders').findOne(queryFilter, resultFilter, queryOptions).then(
			(result) => {
		
				order = result;
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
		return { messages, order };
	}

	// Order document insert
	async function addOrder(db, order) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			await db.collection('orders').insertOne(
				{ 'userID':order.userID,'date':order.date,'items':order.items },
				queryOptions
			).then(() => {}, (err) =>  {

				if (err) { 

					messages.txt = 'Error inserting order into database';
					throw err; 
				}
			});

			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Order insert complete';
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

	// Rate an item within an order
	async function rateOrderItem(db, orderID, itemID, rating) {

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			let items = null;

			// Ensure the order exists and get its items
			let orderQueryFilter = { '_id':orderID };
			let orderResultFilter= {};
			await getOneOrder(db, orderQueryFilter, orderResultFilter).then(
			(result) => {

				if (!result.order) {

					messages.txt = 'Error reading order from database';
					throw new Error('The requested order could not be found');
				}

				items = result.order.items;
			}, 
			(err) => {

				if (err) {

					messages.txt = 'Error reading order from database';
					throw err;
				}
			})

			// Ensure the item exists
			let itemQueryFilter = { 'itemID':itemID };
			let itemResultFilter= {};
			await getOneItem(db, itemQueryFilter, itemResultFilter).then(
			(result) => {

				if (!result) {

					messages.txt = 'Error reading item from database';
					throw new Error('The requested item could not be found');
				}
			}, 
			(err) => {

				if (err) {

					messages.txt = 'Error reading item from database';
					throw err;
				}
			});

			let found = false;

			// Add the rating to the requested item if it exists in the order
			items.forEach((item) => {

				if (item.itemID == itemID) {

					item.rating = rating;
					found = true;
					return;
				}
			})

			// Make sure an item was found and rated
			if (!found) {

				messages.txt = 'The item was not present within the given order';
				throw new Error(messages.txt);
			}

			// Update the order with the new item list
			let updateFilter = { '_id':orderID };
			let updateColumn = { $set: { 'items':items } };
			await db.collection('orders').updateOne(updateFilter, updateColumn, queryOptions).then(
			() => {}, 
			(err) =>  {

				if (err) { 

					messages.txt = 'Error inserting order into database';
					throw err; 
				}
			});

			// Insert the rated item into a separate "ratings" table
			let ratingEntry = { 'orderID':orderID, 'itemID':itemID, 'rating':rating }
			await db.collection('ratings').insertOne(ratingEntry, queryOptions).then(
			() => {}, 
			(err) => {

				if (err) {

					messages.txt = 'Error inserting rating into database';
					throw err;
				}
			});


			// Commit transaction
			await session.commitTransaction();

			messages.txt = 'Item rating complete';
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

	// Get the (unrounded) average rating of the specified item
	async function getAverageRating(db, itemID) {

		let item = { 'rating':0,'numRatings':0 };

		const session = await mongoClient.startSession();
		messages = {};

		// Begin transaction
		session.startTransaction();

		try {

			const queryOptions = { session };

			// Get all ratings of the item
			let ratingEntries = [];
			let cursor = db.collection('ratings').find({'itemID':itemID}, {}, queryOptions);
			await executeQueryCursor(cursor).then((result) => {
				
				ratingEntries = result;

			}, (err) => {

				messages.txt = 'Database query failed!';
				throw(err);
			});

			// Get average rating (unrounded)
			item.numRatings = ratingEntries.length;
			let totalRating = 0;
			
			if (item.numRatings > 0) {

				ratingEntries.forEach((entry) => {

					totalRating += entry.rating;
				});
	
				item.rating = totalRating / item.numRatings;
			}
			else {

				item.rating = 0;
			}

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



	/* Other Database Functions */
	
	// Retrieve information from a database cursor and store the results in a list
	async function executeQueryCursor(cursor) {

		let data = [];

		await cursor.forEach((record) => {

			data.push(record);
		})

		return data;
	}

	// Establish connection to database
	function establishDBConnection() {

		let db = mongoClient.db('shopDB');
	
		if (!db) {
			
			console.error('DB was null!');
			return res.redirect('error');
		}
	
		console.log('Database connection successful');
		return db;
	}

	return app;
}