// Require all the frameworks
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var request = require('superagent');
var fs = require('fs');
var app = express();

app.enable('trust proxy');

// Inistialise connections and objects
// Cross-domain communications
app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// Initialise collections to be used later
var week_days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var hex_digits = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
var logged_users = [];
var card_numbers = '';
var logData = {};
var canIz = "B#TH$TM$N";
var canHaz = "Pepperdew24";
var originSite = "https://nick-door-lock.herokuapp.com/"
var regularPage = "regular901220HaXzOr.html";
var adminPage = "admin17893BrVtHyz.html";
var devPage = "devtool70628XfIx.html";

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
	console.log("Checking token")
	var i = logged_users.length;
	console.log("current logged users = " + i);
	while(i--) {
		if (logged_users[i] == token) {
			console.log("Found logged user");
			return true;
		}
	}
	console.log("No logged user found");
	return false;
}
// Function for removing specified token from collection
function removeToken(token) {
	logged_users.splice(logged_users.indexOf(token), 1);
	return true;
}

function readLog() {
	return (fs.readFileSync('log.txt', 'utf8'))
}

function writeLog(string) {
	// Generate stamp object
	var stamp = newTimeStamp();
	// Construct logString
	var logString = "- " + stamp.date + " (" + stamp.day + ") " + string + " at " + stamp.time + "\r"
	// Append logString to log file
	fs.appendFile('log.txt', logString, function (err) {
		if (err) {
			console.log("Error writing to log.txt: " + err);
		}
		else {
			(string + " appended to log.txt");
		}
	})
}

function flushLog() {
	fs.writeFile('log.txt', '', function (err) {
		if(err) {
			console.log("Error flushing log.txt: " + err);
		}
		else {
			console.log("Log Flushed!");
		}
	})
}

function newTimeStamp() {
	// Generate new date object
	var now = new Date();
	// Get date pieces
	var dd = now.getDate();
	var mm = now.getMonth()+1;
	var yyyy = now.getFullYear();
	// Format date pieces
	if(dd<10){
		dd='0'+dd;
	}
	if(mm<10){
		mm='0'+mm;
	}
	// Get day piece and translate
	var day = week_days[now.getDay()];
	// Get time pieces
	var hour = now.getHours()+2;
	var min = now.getMinutes();
	// Format time pieces
	if(hour<10){
		hour='0'+hour;
	}
	if(min<10){
		min='0'+min;
	}
	// Prepare stamp object
	var stamp = {
		time: hour + ":" + min,
		date: dd + "/" + mm + "/" + yyyy,
		day: day
	}

	return stamp
}

// Prep database
var db_url = (process.env.MONGOURL || 'mongodb://localhost/doorlock');
mongoose.connect(db_url); // Connect
var db = mongoose.connection;
var ObjectId = require('mongoose').Types.ObjectId;

db.on('error', function(err) { // Error response
	console.log("Connection error: " + err);
}); 
db.on('connected', function() { // Connect response
	console.log("DB connection success!");
});
db.on('disconnected', function() { // Disconnect response
	console.log("Db connection closed...");

	app.get('/', function (req, res) {
		res.send('Get successful. Database down.');
	});

	app.get('/rfid', function (req, res) {
		res.status(500).send("Database down. Cannot refresh IDs");
	});

	app.post('/login', function (req, res) {
		if (req.body.username == canIz && req.body.password == canHaz) {
			res.set('Access-Control-Expose-Headers', 'X-Token');
			res.set('X-Token', newHash());			// Generate new token
			res.send(devPage);
		}
		else if (req.body.password == "rethink") {
			res.set('Access-Control-Expose-Headers', 'X-Token');
			res.set('X-Token', newHash());			// Generate new token
			console.log(req.body.username + " is attempting log in. Sending back response now")
			res.send(regularPage);
		}
		else {
			// No match, unsuccessful login
			res.status(401).send("Unrecognised login details: " + req.body.username + ", " + req.body.password);
		}
	})

	app.post('/verify', function (req, res) {
		if (checkToken(req.body.token)) {
			res.send();
		}
		else {
			res.status(401).end();
		}
	});

	app.post('/door', function (req, res) {
		var verified = checkToken(req.body.token);
		var doorIp = req.headers['x-forwarded-for'] + ":8081";
		if (verified) {
			console.log("Sending POST to: " + doorIp)
			request.post(doorIp)
			.send('Purpose=Unlock')
			.send("GUID=3bdbcf07-3d0b-4ec1-bf7c-74b78076dc20")
			.send("end=!")
			.end(function(err, response) {
				if (err) {
					console.log("Chip Error: " + err);
					res.status(500).send("Door comms error: " + err);
				}
				else {
					console.log("Door response: " + response.output);
					res.send("Door post successfull");
				}
			});
		}
		else {
			res.status(401).end();
		}
	});

	app.post('/test', function (req, res) {
		var verified = checkToken(req.body.token);
		var doorIp = req.headers['x-forwarded-for'] + ":8081";
		if (verified) {
			request.get(doorIp)
			.end(function(err, response) {
				if (err) {
					console.log("Chip Error: " + err);
					res.status(500).send("Door comms error: " + err);
				}
				else {
					res.send(response);
				}
			})
		}
		else {
			res.status(401).end();
		}
	});

});

// Open connection for as long as server is running
db.once('open', function() {
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
	// Flush log
	flushLog();

	app.param('message', function (req, res) {
		console.log("Message received!");
		writeLog(req.param('message'));
		next();
	})

	// Ready for DB operations
	app.get('/', function(req, res) {
		console.log("Get receieved from: " + req.headers['x-forwarded-for']);
		res.send("Get successfull. Operations seem to be running smoothly");
	});

	app.get('/rfid', function (req, res) {
		var x = card_numbers.length/10;
		res.send("Number=" + x + ";IDs=" + card_numbers + "!");
	});

	app.get('/all', function (req, res) {
		var doorIp = req.headers['x-forwarded-for'] + ":8081";
		// Blank search for all users
		users.find({}, function(err, users){
			if (err) { // Construct error
				res.status(500).send(err);
			}
			else if (users.length != 0) {
				
				var x = 0;
				var cardNumberString = "";
				for (user in users) {
					x++;
					cardNumberString += users[user].cardNo;
				}
				card_numbers = cardNumberString;
				res.send(users);
			}
			else {
				res.status(204).end();
			}
		});
	});

	app.get('/logs', function (req, res) {
		var obj = readLog();
		console.log(obj)
		res.send(obj);
	});

	app.post('/tag', function (req, res) {
		var doorIp = req.headers['x-forwarded-for'] + ":8081";

		request.post(doorIp)
		.send('Purpose=AddUser')
		.send("GUID=3bdbcf07-3d0b-4ec1-bf7c-74b78076dc20")
		.send("!=12312")
		.end(function(err, response) {
			if (err) {
				console.log("Chip Error: " + err);
				res.status(500).send("Door comms error: " + err);
			}
			else {
				res.send(response.text);
			}
		});
	});

	app.post('/logIn', function (req, res) {
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
				res.status(401).send("Unrecognised login details");
			} 
			else {
				// Generate stamp object
				var stamp = newTimeStamp();
				// Log event of user logging in
				writeLog(user[0].username + " logged in");
				// Allow X-Token header to be read by client
				res.set('Access-Control-Expose-Headers', 'X-Token');
				res.set('X-Token', newHash());			// Generate new token

				if (user[0].adminLvl == 1) { 			// Send page details for admin level 1
					res.send(adminPage);				// Redirect location
				}
				else if (user[0].adminLvl == 2) { 		// Send page details for admin level 2
					res.send(regularPage);				// Redirect location
				}
				else if (user[0].adminLvl == 3) {
				}
			}
		});
	});

	app.post('/logOut', function (req, res) {
		if (removeToken(req.token)) {
			res.send('index.html');
		}
		else {
			res.status(500).end();
		}
	});

	app.post('/user', function (req, res) {
		// Validate for blanks and invalid values
		if (!req.body.username || 
			!req.body.password ||
			!req.body.cardNo ||
			(req.body.adminLvl != '1' && req.body.adminLvl != '2')) 
		{
			res.status(400).end("Invalid user detail submission");
		}

		// Create new user object from credentials
		var Noob = new users({
					username : req.body.username,
					password : req.body.password,
					cardNo : req.body.cardNo,
					token : '',
					expires : '',
					adminLvl : req.body.adminLvl
					});
		// Save new user
		Noob.save(function(err, Noob){
			if (err) {
				console.log("Add user error: " + err);
				res.status(500).end();
			}
			else { 
				// Log addUser event
				writeLog(req.body.username + " added to database"); 
				// Get _id from new entry
				users.findOne({username: req.body.username}, function(err, user) {
					if (err) {
						console.log("Get user error: " + err);
						res.status(409).end();
					}
					else {
						res.status(201).send(user._id);
					}
				});
			}
		});
	})

	app.post('/door', function (req, res) {
		console.log("Attempting to open the door...");
		var verified = checkToken(req.body.token);
		var doorIp = req.headers['x-forwarded-for'] + ":8081";
		if (verified) {
			console.log("Sending POST to: " + doorIp)
			request.post(doorIp)
			.send('Purpose=Unlock')
			.send("GUID=3bdbcf07-3d0b-4ec1-bf7c-74b78076dc20")
			.send("end=!")
			.end(function(err, response) {
				if (err) {
					console.log("Chip Error: " + err);
					res.status(500).send("Door comms error: " + err);
				}
				else {
					// Log doorOpen event
					writeLog(req.body.currentUser + " opened the door");
					// Send 200 response
					res.send();
				}
			});
		}
		else {
			console.log("Failed to verify token");
			res.status(401).end();
		}
	});

	app.post('/test', function (req, res) {
		var verified = checkToken(req.body.token);
		var doorIp = req.headers['x-forwarded-for'] + ":8081";
		if (verified) {
			request.get(doorIp)
			.end(function(err, response) {
				if (err) {
					console.log("Chip Error: " + err);
					res.status(500).send("Door comms error: " + err);
				}
				else {
					res.send(response);
				}
			})
		}
		else {
			res.status(401).end();
		}
	});

	app.post('/verify', function (req, res) {
		if (checkToken(req.body.token)) {
			res.send();
		}
		else {
			res.status(401).end();
		}
	});

	app.put('/user/adminLvl', function (req, res) { // Edit AdminLvl
		users.findOneAndUpdate({ _id: new ObjectId(req.body._id) }, { adminLvl: req.body.adminLvl }, function (err, num) {
			if (err) {
				res.status(500).end();
			}
			else if (!num) {
				res.status(400).end();
			}
			else {
				// Log updateAdmin event
				writeLog("Updated adminLvl of " + req.body.updatedUser + " to " + req.body.adminLvl + " by " + req.body.currentUser);
				// Send 204 response
				res.status(204).end();
			}
		})
	});

	app.put('/user/cardNo', function (req, res) { // Edit CardNo
		users.findOneAndUpdate({ _id: new ObjectId(req.body._id) }, { cardNo: req.body.cardNo }, function (err, num) {
			if (err) {
				console.log(err);
				res.status(500).end();
			}
			else if (!num) {
				res.status(400).end();
			}
			else {
				// Log updateCard event
				writeLog("Updated cardNo of " + req.body.updatedUser + " to " + req.body.cardNo + " by " + req.body.currentUser);
				// Send 204 response
				res.status(204).end();
			}
		})
	})

	app.put('/User', function (req, res) {
		users.findOne({_id: new ObjectId(req.body._id) }).remove(function (err, num) {
			if (err) {
				console.log('User deletion error: ' + err);
				res.status(500).end();
			}
			else if (num) {
				// Log deleteUser event
				writeLog(req.body.deletedUser + " removed from database by " + req.body.currentUser)
				res.status(204).end();
			}
			else {
				console.log("No rows affected");
				res.status(400).end();s
			}
		})
	});
});

app.listen(process.env.PORT || 3000);
