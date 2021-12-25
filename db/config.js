const { Pool } = require('pg');
const { db } = require('../private/config.json');

const pool = new Pool ({
    user: db.user,
    host: db.host,
    database: db.database,
    password: db.password,
    port: db.port
});

module.exports.pquery = async function(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    //console.log('executed query', {text, duration, rows: result.rowCount});
    return result.rows;
};