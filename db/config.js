const { Pool } = require('pg');
const auth = require('../static/private/auth.json');

const pool = new Pool ({
    user: auth.db.user,
    host: auth.db.host,
    database: auth.db.database,
    password: auth.db.password,
    port: auth.db.port
});

module.exports.pquery = async function(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', {text, duration, rows: result.rowCount});
    return result.rows;
};