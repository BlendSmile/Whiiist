//this software is licensed under the GNU GPL license.
//Please don't misuse the source code
//Salaam...
//Muhammad Alif Vardha (blend_smile)

const express = require('express');
const app = express();
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
const db = require('/home/runner/Whiiist-JS/db')
const ejs = require('ejs')

var session = require("express-session"),
	bodyParser = require("body-parser")

app.use(express.static("public"))
app.use(session({ secret: "cats" }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(passport.initialize())
app.use(passport.session())

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
var useRep

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
				useRep = result.rows[0].reputation
			}
  		})
	}
)

app.post('/reg', (req, res) => {
	username = req.body.username
 	userDesc = req.body.description
	userId = googleId
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
				db.query('INSERT INTO users(id, name, description) VALUES($1, $2, $3)', [userId, username, userDesc], (err, result2) => {
					if(err) {
						console.log(err);
						res.write('error registering')
					}
					console.log(result2);
					res.redirect('/home');
				})
			} else if(result.rows.length > 0) {
				res.send('another whistler is also using that username, please pick anything else')
			}
		})
	}
})

app.get('/', (req, res) => {
    res.sendFile('views/home.html', {root: __dirname });
})

app.get('/home', (req, res) => {
	res.render('home', {username: username});
});

app.listen(3000, () => {
    console.log('server started');
});
