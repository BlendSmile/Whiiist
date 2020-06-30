const { Pool } = require('pg')
const pool = new Pool({
	connectionString: process.env.DB_URL
})
module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback)
  },
}