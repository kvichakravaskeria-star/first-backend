const {Pool}=require('pg');

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password:process.env.DB_PASSWORD,
    database: 'task_db',
    port: 5432,
});

module.exports = pool;
