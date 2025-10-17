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

const port = 3000;

app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to bind to port 3000:', err);
    process.exit(1);
  }
  console.log(`Server is running on http://0.0.0.0:${port}`);
});