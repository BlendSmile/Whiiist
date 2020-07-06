const db = require('/home/runner/Whiiist-JS/db')

module.exports = {
	viewUser: (reqUser, callback) => {
		//get requested user whistles and profile
		db.query('SELECT FROM users WHERE name=$1', [reqUser], (err, result) => {
			if(err) {
				res.send('error getting user data')
			} else {
				//check if user exist
				if(result.rows.length > 0) { //exist
					var reqUserId = result.rows[0].id
					var reqUserDesc = result.rows[0].description
					//get user followers
					db.query('SELECT FROM follower WHERE followeduserid = $1', [reqUserId], (err, result2) => {
						var reqUserFollower  = result2.rows.length
						//get user whistles
						db.query('SELECT * FROM whistles WHERE from_user=$1', [reqUserId], (err, result3) => {
							if(err) {
								res.send('error getting user data')
							} else {
								//calculate user reputations
								var reqUserRep = 0
								for(var i = 0; i < result3.rows.length; i++) {
									reqUserRep += result3.rows[i].up_vote * 5
									reqUserRep -= result3.rows[i].down_vote * 5
								}
								callback(reqUserId, reqUserDesc, reqUserFollower, reqUserRep, result3.rows)
							}
						})
					})
				} else { //not exist
					return 'whistler you are seeking could not be found :('
				}
			}
		})
	},
	createUser: (userId, username, userDesc, callback) => {
		var msg
		db.query('SELECT FROM users WHERE id=$1', [userId], (err, result0) => {
			if(result0.rows.length > 0) {
				msg = "you're already registed before"
				callback(msg)
			} else if(result0.rows.length == 0) {
				//check if username is illegal
				if(username != username.trim()) {
					msg = 'please remove any trailing whitespace'
					callback(msg)
				} else {
					//check if username is used
					db.query('SELECT FROM users WHERE name=$1;', [username], (err, result) => {
						if(err) {
							console.log(err);
						}
						if(result.rows.length == 0) {
							//insert to database
							db.query("INSERT INTO users(id, name, description, reputation, followers, upvoted_post, downvoted_post, interest) VALUES($1, $2, $3, 0, 0, ARRAY['0'], ARRAY['0'], ARRAY['0']);", [userId, username, userDesc], (err, result2) => {
								if(err) console.log(err)
								callback(msg)
							})
						} else {
							msg = 'another whistler is also using that username, please pick anything else'
							callback(msg)
						}
					})
				}
			}
		})
	},
	editUser: (userId, username, userDesc, callback) => {
		var msg
		//check if username is illegal
		if(username != username.trim()) {
			msg = 'please remove any trailing whitespace'
			callback(msg)
		} else {
			//check if username is used
			db.query('SELECT name FROM users WHERE name=$1;', [username], (err, result) => {
				if(err) console.log(err)

				if(result.rows.length == 0) {				
					//update database
					db.query('UPDATE users SET name = $1, description = $2 WHERE id=$3', [username, userDesc, userId] , (err, result) => {
						if(err) console.log(err)
						callback(msg)
					})
				} else if(result.rows.length > 0) {
					msg = 'another whistler is also using that username, please pick anything else'
					callback(msg)
				}
			})
		}
	},
	followUser: (userId, reqUser) => {
		db.query('SELECT FROM follower WHERE followinguserid = $1 AND followeduserid = $2', [userId, reqUser], (err, result) => {
			var msg
			if(result.rows.length > 0) { //if yes then unfollow
				//delete current user from the requested user to unfollow
				db.query('DELETE FROM follower WHERE followinguserid = $1 AND followeduserid = $2', [userId, reqUser], (err, result2) => {
					msg = -1
					callback(msg)
				})
			} else if(result.rows.length == 0) { //if not then follow
				//insert to user so it cannot be followed twice
				db.query('INSERT INTO follower(followeduserid, followeduserid) VALUES ($1, $2)', [userId, reqUser], (err, result2) => {
					msg = 1
					callback(msg)
				})
			}
		})
	}
}