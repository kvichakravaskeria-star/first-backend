require('dotenv').config();

const  pool  = require('./db');

async function testConnection() {
    try {
        const results = await pool.query('SELECT NOW()');

        console.log('Connected to the database');
        console.log('Database time:', results.rows[0].now);
       
    } catch (error) {
        console.error('Error connecting to the database', error.message);
    }finally {
       await pool.end();
    }
}

testConnection();