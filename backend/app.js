const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { router: authRoutes } = require('./auth');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'],       
    credentials: true                
  }));

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log('Server is running on port 3000');
});