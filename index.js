/*
this software is licensed under the GNU GPL license in hope that
it will be useful. Please don't misuse the source code
Salaam...

PS~ to understand the source code, try messing around on Whiiist first, 
i don't include much comments here lol

----Muhammad Alif Vardha (blend_smile)
*/

const express = require('express');
const app = express();
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const db = require('/home/runner/Whiiist-JS/db')
const ejs = require('ejs')
const sanitizeHtml = require('sanitize-html');
const rateLimit = require("express-rate-limit");
var session = require("express-session"),
	bodyParser = require("body-parser")

app.use(express.static("public"))
app.use(session({ secret: "cats" }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(passport.initialize())
app.use(passport.session())

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

//limit up vote and down vote per 1/2 minute
const upVoteLimiter = rateLimit({
  windowMs: 30 * 1000, // 1/2 minute window
  max: 1, // start blocking after 1 requests
  message:'do it again after half a minute'
})
const downVoteLimiter = rateLimit({
  windowMs: 30 * 1000, // 1/2 minute window
  max: 1, // start blocking after 1 requests
  message:'do it again after half a minute'
})

app.set('view engine', 'ejs');

//configure passport
passport.serializeUser(function(user, done) {
  done(null, user)
})

passport.deserializeUser(function(user, done) {
  done(null, user)
})

passport.use(new GoogleStrategy({
		clientID: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		callbackURL: "https://whiiist-js--blendsmile.repl.co/auth/google/callback"
	},
	function(accessToken, refreshToken, profile, done) {
		/*User.findOrCreate({ googleId: profile.id }, function (err, user) {
			return done(err, user)
		});*/
		if (profile) {
			user = profile;
			return done(null, user)
		} else {
			return done(null, false)
		}
	}
))

//google authentication
app.get('/auth/google',
	passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] })
)
//variable that will store id and email from google sign in
var googleId
//variable that will store user profiles from database
var userId
var username
var userEmail
var userDesc
var userInterest
var userFollower
var userRep

app.get('/auth/google/callback', 
  	passport.authenticate('google', { failureRedirect: '/' }),
  	function(req, res) {
		//check if user exist
		googleId = req.user.id
		db.query('SELECT * FROM users WHERE id=$1;', [googleId], (err, result) => {
   			if (err) {
				console.log(err)
    		}
   			if(result.rows.length == 0) { //if not exist, then prompt user to register
				res.sendFile('views/register.html', {root: __dirname})
			} else if(result.rows.length > 0) { //if exists, then redirect user to home
				res.redirect('/home');
				userId = result.rows[0].id
				username = result.rows[0].name
				userEmail = result.rows[0].email
				userDesc = result.rows[0].description
				userInterest = result.rows[0].interest
				userFollower = result.rows[0].followers
				userRep = result.rows[0].reputation
			}
  		})
	}
)

app.post('/reg', (req, res) => {
	if(googleId=undefined) {
		res.redirect('/')
	} else {
		username = req.body.username
 		userDesc = req.body.description
		userId = googleId
		//sanitize
		userDesc = sanitizeHtml(userDesc)
		username = sanitizeHtml(username)
		//check if id is not used
		db.query('SELECT * FROM users WHERE id=$1', [userId], (err, result0) => {
			if(result.rows.length > 0) {
				res.send("you're already registed")
			} else if(result.rows.length == 0) {
				//check if username is illegal
				if(req.body.username != req.body.username.trim()) {
					res.send('please remove any trailing whitespace')
				} else {
					//check if username is used
					db.query('SELECT * FROM users WHERE name=$1;', [req.body.username], (err, result) => {
						if(err) {
							console.log(err);
						}
						if(result.rows.length == 0) {
							//insert to database
							db.query("INSERT INTO users(id, name, description, reputation, followers, upvoted_post, downvoted_post, interest) VALUES($1, $2, $3, 0, 0, ARRAY['0'], ARRAY['0'], ARRAY['0']);", [userId, username, userDesc], (err, result2) => {
								if(err) {
									console.log(err)
									res.write('error registering')
								}
								console.log(result2)
								res.redirect('/home')
							})
						} else if(result.rows.length > 0) {
							res.send('another whistler is also using that username, please pick anything else')
						}
					})
				}
			}
		})
	}
})

app.get('/', (req, res) => {
    res.sendFile('views/home.html', {root: __dirname })
})

app.get('/home', (req, res) => {
	res.render('home', {username: username, meLink: "/user?u=" + username})
})

app.get('/user', (req, res) => {
	var reqUser = req.query.u
	var reqUserId
	var reqUserDesc
	var reqUserRep
	var reqUserFollower
	//get requested user whistles and profile
	db.query('SELECT * FROM users WHERE name=$1', [reqUser], (err, result) => {
		if(err) {
			res.send('error getting user data')
		} else {
			//check if user exist
			if(result.rows.length > 0) { //exist
				reqUserId = result.rows[0].id
				reqUserDesc = result.rows[0].description
				reqUserRep = result.rows[0].reputation
				reqUserFollower = result.rows[0].followers
				//get user whistles
				db.query('SELECT * FROM whistles WHERE from_user=$1', [reqUser], (err, result2) => {
					if(err) {
						res.send('error getting user data')
					} else {
						whistles = result2.rows
						res.render('user', {username: username, 
										reqUsername: reqUser, 
										userDesc: reqUserDesc, 
										meLink: "/user?u=" + username,
										userRep: reqUserRep,
										userFollower: reqUserFollower,
										whistles: whistles
										})
					}
				})
			} else { //not exist
				res.send('whistler you are seeking could not be found :(')
			}
		}
	})
})

app.get('/new_whistle', (req, res) => {
	res.render('new_whistle', {username: username, meLink: "/user?u=" + username})
})
app.post('/process_whistle', (req, res) => {
	if(userId == undefined) {
		res.redirect('/')
	}
	else {
		var title = req.body.title
		var content =  req.body.content
		var topic = req.body.topic
		var id
		//encode
		title = sanitizeHtml(title)
		content = sanitizeHtml(content)
		topic = sanitizeHtml(topic)
		db.query('SELECT * FROM whistles WHERE from_user=$1', [username], (err, result) => {
			var nextId = result.rows.length + 1
			id = userId + nextId.toString()
			//insert to database
			db.query('INSERT INTO whistles(id, title, content, topic, from_user, up_vote, down_vote) VALUES ($1, $2, $3, $4, $5, 0, 0);', [id, title, content, topic, username], (err, result2) => {
				if(err) {
					res.send('an error occured')
					console.log(err)
				} else {
					res.redirect('/home')
				}
			})
		})
	}
})

app.get('/whistle', (req, res) => {
	var whistle = req.query.w
	db.query('SELECT * FROM whistles WHERE id=$1', [whistle], (req, result) => {
		if(result.rows.length > 0) {
			res.render('whistle',
						{title: result.rows[0].title, 
						content: result.rows[0].content, 
						topic: result.rows[0].topic, 
						username: username, 
						meLink: "/user?u=" + username, 
						user: result.rows[0].from_user, 
						userLink: "/user?u=" + result.rows[0].from_user,
						upvote_count: result.rows[0].up_vote,
						downvote_count: result.rows[0].down_vote,
						upvoteLink: "/upvote?id=" + whistle,
						downvoteLink: "/downvote?id=" + whistle})
		} else {
			res.send("can't hear the whistle you're seeking (404 not found)")
		}
	})
})

app.get('/upvote', upVoteLimiter, (req, res) => {
	if(userId == undefined) {
		res.redirect('/')
	} else {	
		//check the user is not upvoting the current whisle before
		var whistleId = req.query.id;
		db.query('SELECT name FROM users WHERE $1=ANY(upvoted_post) AND name=$2;', [whistleId, username], (err, result) => {
			if(result.rows.length > 0) {
				//delete from user
				db.query('UPDATE users SET upvoted_post = array_remove(upvoted_post, $1);', [whistleId], (err, result2) => {
					//decrement the upvote value 
					db.query('UPDATE whistles SET up_vote = up_vote - 1 WHERE id = $1', [whistleId], (err, result3) => {
						res.send('-1');
					})
				})
			} else if(result.rows.length == 0) {
				//insert to user so it cannot be voted twice
				db.query('UPDATE users SET upvoted_post = array_append(upvoted_post, $1) WHERE id=$2;', [whistleId, userId], (err, result2) => {
					//increment the upvote value
					db.query('UPDATE whistles SET up_vote = up_vote + 1 WHERE id = $1', [whistleId], (err, result3) => {
						res.send('1');
					})
				})
			}
		})
	}
})

app.get('/downvote', downVoteLimiter, (req, res) => {
	if(userId == undefined) {
		res.redirect('/')
	} else {
		var whistleId = req.query.id;
		db.query('SELECT name FROM users WHERE $1=ANY(downvoted_post) AND name=$2;', [whistleId, username], (err, result) => {
			if(result.rows.length > 0) {
				//delete from user
				db.query('UPDATE users SET downvoted_post = array_remove(downvoted_post, $1);', [whistleId], (err, result2) => {
					//decrement the downvote value 
					db.query('UPDATE whistles SET down_vote = down_vote - 1 WHERE id = $1', [whistleId], (err, result3) => {
						res.send('-1');
					})
				})
			} else if(result.rows.length == 0) {
				//insert to user so it cannot be voted twice
				db.query('UPDATE users SET downvoted_post = array_append(downvoted_post, $1) WHERE id=$2;', [whistleId, userId], (err, result2) => {
					//increment the downnvote value
					db.query('UPDATE whistles SET down_vote = down_vote + 1 WHERE id = $1;', [whistleId], (err, result3) => {
						res.send('1');
					})
				})
			}
		})
	}
})

app.listen(3000, () => {
    console.log('server started');
});

//various functions
function uuidv4() {
 	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    	var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    	return v.toString(16);
  	});
}