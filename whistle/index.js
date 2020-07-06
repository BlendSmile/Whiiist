const db = require('/home/runner/Whiiist-JS/db')

module.exports = {
	upVote: (whistleId, userId, from_user) => {
		var result
		//check if the user has upvoted it before
		db.query('SELECT id FROM up_vote WHERE id = $1 AND userid = $2', [whistleId, userId], (err, result) => {
			if(result.rows.length > 0) {			
				//delete from user
				db.query('DELETE FROM up_vote WHERE id = $1 AND userid = $2', [whistleId, userId], (err, result2) => {
					db.query('UPDATE whistles SET down_vote WHERE id = $1', [whistleId], (err, res) => {
						result = -1
						callback(result)
					})
				})
			} else if(result.rows.length == 0) {
				//insert so it cannot be voted twice
				db.query('INSERT INTO up_vote(id, userid) VALUES($1, $2)', [whistleId, userId], (err, result2) => {				
					db.query('UPDATE whistles SET down_vote WHERE id = $1', [whistleId], (err, res) => {
						result = 1
						callback(result)
					})
				})				
			}
		})
	},

	downVote: (whistleId, userId, callback) => {
		db.query('SELECT id FROM down_vote WHERE id = $1 AND userid = $2', [whistleId, userId], (err, result) => {
			if(result.rows.length > 0) {
				var result
				//delete from user
				db.query('DELETE FROM down_vote WHERE id = $1 AND userid = $2', [whistleId, userId], (err, result2) => {
					db.query('UPDATE whistles SET down_vote WHERE id = $1', [whistleId], (err, res) => {
						result = -1
						callback(result)
					})					
				})
				
			} else if(result.rows.length == 0) {
				//insert to user so it cannot be voted twice
				db.query('INSERT INTO down_vote(id, userid) VALUES($1, $2)', [whistleId, userId], (err, result2) => {
					result = 1
					callback(result)
				})		
			}
		})
	},

	createWhistle: (title, content, topic, userId, callback) => {		
		var id
		db.query('SELECT id FROM whistles WHERE from_user=$1', [userId], (err, result) => {
			if(err) {
				console.log(err)
			} else {
				//generate id
				if(result.rows.length > 0) { //if user has whistled before
					id = userId + '-' + (Number(result.rows[result.rows.length].id.split('-')[1]) + 1)

				} else { //if this is the first time user is whistling
					id = userId + '-0'
				}

				//insert to database
				db.query('INSERT INTO whistles(id, title, content, topic, from_user, up_vote, down_vote) VALUES ($1, $2, $3, $4, $5, 0, 0);', [id, title, content, topic, userId], (err, result2) => {
					if(err) {
						console.log(err)
					} else {
						callback()
					}
				})
			}
		})
	},

	viewWhistle: (whistleId, userId, callback) => {
		var title
		var content
		var topic
		var msg
		var username
		var upvoteCount
		var downvoteCount
		//get whistle's contents and upvotes
		db.query('SELECT * FROM whistles WHERE id=$1', [whistleId], (err, result) => {
			if(result.rows.length > 0) {
				title = result.rows[0].title
				content = result.rows[0].content
				topic = result.rows[0].topic
				upvoteCount = result.rows[0].up_vote
				downvoteCount = result.rows[0].down_vote
				//get username from id
				db.query('SELECT name FROM users WHERE id=$1', [result.rows[0].from_user], (err, result2) => {
					username = result2.rows[0].name
					callback(username, title, content, topic, upvoteCount, downvoteCount, msg)
				})
			} else {
				msg = '404 not found'
				callback(undefined, undefined, undefined, undefined, undefined, undefined, msg)
			}
		})
	},

	editWhistle: (whistleId, userId, title, content, topic, callback) => {
		var msg
		db.query('SELECT id FROM whistles WHERE id=$1', [whistleId], (err, result) => {
			if(err) {
				msg = 'an error occured'
				callback(msg)
			} else {
				if(result.rows.length > 0) { //whistle exist
					//check again if its belong to the logged in user
					if(result.rows[0].from_user == userId) { //belong to user
						//update the database
						db.query('UPDATE whistles SET title = $1, content = $2, topic = $3 WHERE id=$4;', [title, content, topic, whistleId], (err, result2) => {
							callback(msg)
						})

					} else { //doesn't belong to user
						msg = 'this whistle is not yours!'
						callback(msg)
					}
				} else { //whistle not found/doesn't exist
					msg = "can't find the whistle you are seeking, it's probably deleted"
					callback(msg)
				}
			}
		})
	},
	deleteWhistle: (whistleId, userId, callback) =>{
		var msg
		db.query('SELECT from_user FROM whistles WHERE id=$1', [whistleId], (err, result) => {
			if(result.rows.length > 0) {
				if(err) {
					msg = 'an unexpected error occured'
					callback(msg)				
				} else {
					if(result.rows[0].from_user == userId) {
						db.query('DELETE FROM whistles WHERE id=$1', [whistleId], (err, result) => {
							db.query('DELETE FROM up_vote WHERE id = $1', [whistleId], (err, result) => {
								callback(msg)
							})
						})
					} else {
						msg = 'this whistle is not belong to you'
						callback(msg)
					}
				}
			}
		})
	}
}