// Require all the frameworks
var express = require('express');
var Q = require('q');
var cors = require('cors');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require('superagent');
var app = express();


// Inistialise connections and objects
// Cross-domain communications
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// Initialise collections to be used later
var hex_digits = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
var logged_users = [];
var canIz = "B#TH$TM$N";
var canHaz = "Pepperdew";
var db_status;
var originSite = "https://nick-door-lock.herokuapp.com/"
var regularPage = "regular901220HaXzOr.html";
var adminPage = "admin17893BrVtHyz.html";
var devPage = "devtool70628XfIx.html";
var chipDNS = "http://rethinkatthestables.ddns.net";
var localDNS = "10.0.0.101:8081";

// Declare functions
// Function for generating "hash" keys
function newHash() {
	var hash = [];
	for (i = 0; i < 16; i++) {
		do {
			hash[i] = Math.round(Math.random() * 16); // Generate hexadecimal amount
			if (hash[i] > 9) {
				// Convert to hex digit string
				hash[i] = hex_digits[hash[i]-10];
			}
			else {
				// Convert to number string
				hash[i] = hash[i].toString();
			}
		} while (hash[i] == hash[i-1]) // Don't allow doubles in the sequence
	}
	var token = hash.join("");
	logged_users.push(token);
	return token;
};
// Function for checking checking validity of current token
function checkToken(token) {
	var i = logged_users.length;
	while(i--) {
		if (logged_users[i] == token) {
			return true;
		}
	}
	return false;
}
// Function for removing specified token from collection
function removeToken(token) {
	logged_users.splice(logged_users.indexOf(token), 1);
	return true;
}

// Prep database
var db_url = (process.env.MONGOURL || 'mongodb://localhost/doorlock');
mongoose.connect(db_url); // Connect
var db = mongoose.connection;

db.on('error', function(err) { // Error response
	console.log("Connection error: " + err);
	db_status = false;
}); 
db.on('connected', function() { // Connect response
	console.log("DB connection success!");
	db_status = true;
});
db.on('disconnected', function() { // Disconnect response
	console.log("Db connection closed...");
	db_status = false;
});

// Open connection for as long as server is running
db.once('open', function() {
	console.log("DB Status = " + db_status);
	// Define schema structure
	var Schema = mongoose.Schema;

	var userSchema = new Schema({
		username : String,
		password : String,
		adminLvl : Number,
		token: String,
		expires: Date,
		cardNo : String 
		}, {
		autoindex: false
	});
	// Save model
	var users = mongoose.model('users', userSchema);

	// Ready for DB operations
	app.get('/', function(req, res) {
		console.log("Get receieved from: " + req.headers['x-forwarded-for']);
		res.send("Get successfull");
	});

	app.post('/logIn', function (req, res, next) {
		// Prep conditions object
		var conditions = {
			$and: [ 
			{'username': req.body.username},
			{'password': req.body.password}
			]
		};
		// Search for matching user/pword combo
		users.find(conditions, function(err, user) {
			if (err) { 
				// Internal server error
				console.log("Fuck up @ 1: " + err);
				res.status(500).end();
			}
			else if (user.length == 0) {
				// No match, unsuccessful login
				res.status(401).end();
			} 
			else {
				res.set('X-Token', newHash());		// Generate hash token
				if (user[0].adminLvl == 1) { 			// Send page details for admin level 1
					res.send(adminPage); 				// Redirect location
				}
				else if (user[0].adminLvl == 2) { 		// Send page details for admin level 2
					res.send(regularPage);				// Redirect location
				}
				else if (user[0].adminLvl == 3) {
				}
			}
		});
	});

	// default POST response
	app.post('/', function(req, res){
		// log proof of receiving a body
		console.dir(req.body);

		// Operations path depends on 'purpose'
		if (req.body.purpose == 'logIn') { // logIn operation

			
		}
		else if (req.body.purpose == 'getAll') { // Populate user table operation
			// Prep response object. Initialized as an error
			var res_body = {
				reply: false,
				results: '',
				err: 'Unknown'
			};

			// Blank search for all users
			users.find({}, function(err, users){
				if (err) { // Construct error
					res_body.err = err;
				}
				else if (users.length != 0) {
					res_body.reply = true;
					res_body.err = '';
					res_body.results = users;
				}
				else {
					res_body.reply = false;
					res_body.err = 'Database is empty'
				}
				res.json(res_body); // Send response
			});
		}
		else if (req.body.purpose == 'addUser') { // Add new user operation
			// Prep response object
			var res_body = {
				reply: false,
				newId: '',
				err: 'None'
			}

			// Validate for blanks and invalid values
			if (req.body.username == '' || 
				req.body.password == '' ||
				req.body.cardNo == '' ||
				req.body.adminLvl != '1' && req.body.adminLvl != '2') 
			{
				res_body.err = "Invalid Noob details submission from client";
				res.json(res_body);
			}

			var Noob = new users({
						username : req.body.username,
						password : req.body.password,
						cardNo : req.body.cardNo,
						token : '',
						expires : '',
						adminLvl : req.body.adminLvl
						});
		
			Noob.save(function(err, Noob){
				if (err) {
					console.log("Add user error");
					res_body.err = err;
					res.json(res_body);
				}
				else {
					console.log("noob added");
					users.findOne({username: req.body.username}, function(err, user) {
						if (err) return console.error(err);
						res_body.reply = true;
						res_body.newId = user._id;
						res.json(res_body);
					});
				}
			});

		}
		else if (req.body.purpose == 'editUser') { // Update existing user operation
			// Update document
		}
		else if (req.body.purpose == 'removeUser') { // Remove user operation
			var res_body = {
				reply: false,
				err: ''
			}

			users.findOne({_id: req.body._id}).remove(function(err) {
				if (err) {
					res_body.err = err;
				}
				else {
					res_body.reply = true;
				}
				res.json(res_body);
			})
		}
		else if (req.body.purpose == "openDoor") { // Open the door after verifying token
			var res_body = {
				reply: false,
				err: ''
			};
			/*
			console.log(checkToken(req.body.token));
			if (checkToken(req.body.token)) {
				console.log("Sending POST to " + req.headers['x-forwarded-for'] + ":8081")
				request.post(req.headers['x-forwarded-for'] + ':8081')
				.send('Purpose=Unlock')
				.send("GUID=3bdbcf07-3d0b-4ec1-bf7c-74b78076dc20")
				.send("end=!")
				.end(function(err, response) {
					if (err) {
						res_body.err = "Chip Error";
						console.log("Chip Error" + err);
						res.json(res_body);
					}
					else {
						res_body.reply = true;
						console.log("Door should open");
						res.json(res_body);
						console.log(response.body);
					}
				});
			}*/
//req.headers['x-forwarded-for']
			request.get(chipDNS)
			.end(function(err, response) {
				if (err) {
					console.log("Chip Error: " + err);
					res.json(res_body);
				}
				else {
					res_body.reply = true;
					console.log("GET successful");
					res.json(res_body);
				}
			})

		}
		else if (req.body.purpose == "logOut") {
			// Prep response object. Initialized as an error
			var res_body = {
				reply: removeToken(req.token),
				loc: 'index.html'
			};
			res.json(res_body);
		}
		else if (req.body.purpose == "checkUser") {
			// Prep response object. Set 'reply' to the checkToken method's returned value
			var res_body = {
				reply: (checkToken(req.body.token))
			};
			res.json(res_body);
		}
		else { // Purpose attribute missing or invalid
			var res_body = {
				reply: false,
				err: 'Request purpose not recognised'
			};
			res.json(res_body);
		}
	});
});

app.listen(process.env.PORT || 3000);
