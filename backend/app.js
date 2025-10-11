const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./auth');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});