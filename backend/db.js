const mysql = require('mysql2');
require('dotenv').config();

const {
    DB_HOST,
    DB_PORT,
    DB_USER = 'root',
    DB_PASSWORD = 'root',
    DB_NAME = 'mhearts',
    DB_SOCKET,
} = process.env;

const config = {
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
};

if (DB_HOST) {
    config.host = DB_HOST;
    if (DB_PORT) config.port = Number(DB_PORT);
} else if (DB_SOCKET) {
    config.socketPath = DB_SOCKET;
} else {
    // Keep legacy MAMP socket path as last-resort default for convenience
    config.socketPath = '/Applications/MAMP/tmp/mysql/mysql.sock';
}

const connection = mysql.createConnection(config);

module.exports = connection.promise();