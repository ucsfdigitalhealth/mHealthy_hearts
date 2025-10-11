const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    user: 'root',
    password: 'root',
    database: 'mhearts',
    socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock'
});

module.exports = connection.promise();