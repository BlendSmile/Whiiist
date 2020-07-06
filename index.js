/*
   __    _    _   _           __  __  __   _____   _| |_
  /  \  | |  | | | | __      / / / / / /  /  ___\ |_   _|
 / /\ \/   \/  | | |/_  \   / / / / / /   |  \____  | |
 \|  |   |\   /  |  / | |  / / / / / /    /\____  | | |_______
      \_/  \_/   |_|  | | /_/ /_/ /_/    |_______/   \_______/

this software is licensed under the GNU GPL license in hope that
it will be useful. Please don't misuse the source code
Salaam...

PS~ to understand the source code, try messing around on Whiiist first, 
i don't include much comments here lol

====================================================================
 _
/!\ ERROR (since none of you will notice if its a warning): 
‾‾‾
	IF YOU FIND A VULNARABELITY (wich most likely you will), 
	PLEASE CONTACT ME IMMEDIATELY via discord: Blend_Smile#5205 or email: mrelytra@gmail.com
	you'll definitely get some credit if you do ;)
====================================================================

----Muhammad Alif Vardha (blend_smile)
*/
const { google } = require('googleapis')
const express = require('express')
const app = express();
const passport = require('passport')
const db = require('/home/runner/Whiiist-JS/db')
const whistleLib = require('/home/runner/Whiiist-JS/whistle')
const userLib = require('/home/runner/Whiiist-JS/user')
const ejs = require('ejs')
const sanitizeHtml = require('sanitize-html')
const rateLimit = require("express-rate-limit")
const request = require('request')
const csrf = require('csurf')
var cookieParser = require('cookie-parser');
var session = require("express-session"),
	bodyParser = require("body-parser")

app.use(cookieParser()) 
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(passport.initialize())
app.use(passport.session())
app.use(session({ secret: "cats" }))
app.use(express.json())

var csrfProtection = csrf({ cookie: false })
// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

//limit up vote and down vote per 1/2 minute
const upVoteLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // start blocking after 1 requests
  message:'2'
})
const downVoteLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // start blocking after 1 requests
  message:'2'
})
const editProfileLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1, // start blocking after 1 requests
  message:"Please wait for 30 minutes before you edit your profile again"
})
const followLimiter = rateLimit({
	windowMs: 5 * 1000, //5 sec
	max: 1,
	message:'2' 
})
const generalLimiter = rateLimit({
	windowMs: 1 * 1000, //1 sec
	max: 1,
	message: 'Oho! Calm down with the requests'
})
app.set('view engine', 'ejs');

//configure google oauth2 sign in
var OAuth2 = google.auth.OAuth2;

const clientId = process.env.CLIENT_ID // e.g. asdfghjkljhgfdsghjk.apps.googleusercontent.com
const clientSecret = process.env.CLIENT_SECRET // e.g. _ASDFA%DFASDFASDFASD#FAD-
const redirectUrl = "https://whiiist-js--blendsmile.repl.co/auth/google/callback" // this must match your google api settings


const defaultScope = [
  'https://www.googleapis.com/auth/plus.me',
];

//create a Google URL and send to the client to log in the user.
app.get('/auth/google', generalLimiter, (req, res) => {
	var oauth2Client = new OAuth2(clientId,  clientSecret, redirectUrl)
    var scopes = [
    	'https://www.googleapis.com/auth/plus.me'
    ];
 
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes 
    });
  	
	res.redirect(url)
})

//take the "code" parameter which Google gives us once when the user logs in, then get the user's email and id.

app.get('/auth/google/callback', generalLimiter, (req, res) => {
	var oauth2Client = new OAuth2(clientId,  clientSecret, redirectUrl)
	const code = req.query.code
	//check if user exist
	oauth2Client.getToken(code, function(err, tokens) {
		if(!err) { 	
			console.log(tokens)
			var url = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' + tokens.access_token

			request({
			    url: url,
			    json: true
			}, (error, response, body) => {
			    if (!error && response.statusCode === 200) {
			        req.session.googleId = body.sub
					console.log(body)
					console.log(body.sub)
					db.query('SELECT * FROM users WHERE id=$1;', [req.session.googleId], (err, result) => {
   						if (err) {
							console.log(err)
    					}
   						if(result.rows.length == 0) { //if not exist, then prompt user to register
							res.sendFile('views/register.html', {root: __dirname})
						} else if(result.rows.length > 0) { //if exists, then redirect user to home
							req.session.userId = result.rows[0].id
							req.session.username = result.rows[0].name
							req.session.userEmail = result.rows[0].email
							req.session.userDesc = result.rows[0].description
							req.session.userInterest = result.rows[0].interest
							req.session.userFollower = result.rows[0].followers
							req.session.userRep = result.rows[0].reputation
							res.redirect('/home');
						}
  					})
			    }
			})	
      	} else {
        	res.send(`error`);
      	}
    })
})

app.post('/reg', generalLimiter, (req, res) => {
	if(req.session.googleId) {
		var username = sanitizeHtml(req.body.username)
 		var userDesc = sanitizeHtml(req.body.description)
		var userId = req.session.googleId
		//check if id is not used
		userLib.createUser(userId, username, userDesc, (err) => {
			if(!err) {
				req.session.username = username
				req.session.userDesc = userDesc
				req.session.userId = userId
				res.redirect('/home')
			} else {
				res.send(err)
			}
		})
	} else {
		res.redirect('/')
	}
})

app.get('/', generalLimiter, (req, res) => {
    res.sendFile('views/home.html', {root: __dirname })
})

app.get('/home', (req, res) => {
	if(req.session.username) {
		res.render('home', {username: req.session.username, meLink: "/user?u=" + req.session.username})
	} else {
		res.redirect('/')
	}
})

app.get('/user', generalLimiter, (req, res) => {
	var reqUser = req.query.u
	//get requested user whistles and profile
	userLib.viewUser(reqUser, (reqUserId, reqUserDesc, reqUserFollower, reqUserRep, whistles) => {
		res.render('user', {username: req.session.username, 
						reqUsername: reqUser, 
						userDesc: reqUserDesc, 
						meLink: "/user?u=" + req.session.username,
						userRep: reqUserRep,
						userFollower: reqUserFollower,
						whistles: whistles,
						followLink: "/follow?id=" + reqUserId
						})
	})
})

app.get('/new_whistle', csrfProtection, (req, res) => {
	res.render('new_whistle', {username: req.session.username, meLink: "/user?u=" + req.session.username, csrfToken: req.csrfToken()})
})
app.post('/process_whistle', csrfProtection, generalLimiter, (req, res) => {
	if(req.session.userId) {
		var title = sanitizeHtml(req.body.title)
		var content =  sanitizeHtml(req.body.content)
		var topic = sanitizeHtml(req.body.topic)
		whistleLib.createWhistle(title, content, topic, req.session.userId, () => {
			res.redirect('/home')
		})
	} else {
		res.redirect('/')
	}
})

app.get('/whistle', generalLimiter, (req, res) => {
	var whistle = req.query.w
	//get the whistle's contents
	whistleLib.viewWhistle(whistle, req.session.userId, 
	(reqUsername, title, content, topic, upvote, downvote, err) => {
		if(!err) {
			//check if the whistles is belong to user		
			res.render('whistle',
						{title: title, 
						content: content, 
						topic: topic, 
						username: req.session.username, 
						meLink: "/user?u=" + req.session.username, 
						reqUsername: reqUsername, 
						userLink: "/user?u=" + reqUsername,
						upvote_count: upvote,
						downvote_count: downvote,
						upvoteLink: "/upvote?id=" + whistle,
						downvoteLink: "/downvote?id=" + whistle,
						isOwnPost: reqUsername == req.session.username,
						editWhistleLink: "/edit-whistle?id=" + whistle,
						deleteWhistleLink: "/delete-whistle?id=" + whistle})
		} else {
			res.send(err)
		}
	})
})

app.get('/upvote', upVoteLimiter, (req, res) => {
	if(req.session.userId) {	
		var whistleId = req.query.id
		if(req.session.userId != whistleId) {
			res.send(whistleLib.upVote(whistleId, req.sesion.userId))
		}
	} else {
		res.redirect('/')
	}
})

app.get('/downvote', downVoteLimiter, (req, res) => {
	if(req.session.userId) {
		var whistleId = req.query.id
		if(req.session.userId == whistleId) {
			res.send(whistleLib.downVote(whistleId, req.sesion.userId))
		}
	} else {
		res.redirect('/')
	}
})

app.get('/edit-profile', csrfProtection, (req, res) => {
	if(req.session.userId) {
		res.render('edit-profile', {username: req.session.username,
									userDescription: req.session.userDesc,
									meLink: "/user?u=" + req.session.username,
									csrfToken: req.csrfToken()});
	} else {
		res.redirect('/')
	}
})

app.post('/process-edit-profile', csrfProtection, editProfileLimiter, (req, res) => {
	var username = sanitizeHtml(req.body.username)
	var userDesc = sanitizeHtml(req.body.description)
	//check if user has logged in or not
	if(req.session.userId) {
		userLib.editUser(req.session.userId, username, userDesc, (err) => {
			if(!err) {
				req.session.username = username
				req.session.userDesc = userDesc
			} else {
				res.send(err)
			}
		})
	} else {
		res.redirect('/')
	}
})

app.get('/follow', followLimiter, (req, res) => {
	var reqUser = req.query.id //requested user to follow/unfollow
	//check if user is already followng the requested user
	if(req.session.userId) {
		res.send(userLib.followUser(req.session.userId, reqUser))
	} else {
		res.redirect('/')
	}
})

app.get('/edit-whistle', csrfProtection,(req, res) => {
	var whistleId = req.query.id
	res.render('edit_whistle', {
									csrfToken: req.csrfToken(),
									meLink: "/user?u=" + req.session.username,
									username: req.session.username,
									title: result.rows[0].title,
									content: result.rows[0].content,
									topic: result.rows[0].topic,
									whistleId: whistleId
								})
})
app.post('/process-edit-whistle', csrfProtection, (req, res) => {
	var whistleId = req.body.whistle_id
	var title = sanitizeHtml(req.body.title)
	var content = sanitizeHtml(req.body.content)
	var topic = sanitizeHtml(req.body.topic)
	//check again if the whistle exists and belong to the user
	whistleLib.editWhistle(whistleId, req.session.userId, title, content, topic, (err) => {
		if(!err) {
			res.redirect('/')
		} else {
			res.send(err)
		}
	})
})
app.get('/delete-whistle', csrfProtection, (req, res) => {
	res.render('delete-whistle', {username: req.session.username,
								  meLink: "/user?u=" + req.session.username,
								  csrfToken: req.csrfToken(), 
								  whistleId: req.query.id})
})

app.post('/process-delete-whistle', csrfProtection, (req, res) => {
	//check if whistle belongs to current user
	whistleLib.deleteWhistle(req.query.id, req.session.userId, (err) => {
		if(!err) {
			res.redirect('/')
		} else {
			res.send(err)
		}
	})
	
})
app.listen(3000, () => {
    console.log('server started')
});