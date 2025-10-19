import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { router as authRoutes } from "./auth.js";
import omronAuth from "./routes/omron/omronAuth.js";
import omronCallback from "./routes/omron/omronCallback.js";

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'],       
    credentials: true                
  }));

  // Routes
app.use('/api/auth', authRoutes);
app.use("/api/omronAuth", omronAuth.router);
app.use("/api/omronCallback", omronCallback.router);

const PORT = process.env.PORT;

const port = 3000;

app.get("/fetchdata", (req, res) => {
  const accessToken = req.query.access_token;
  res.json({
    message: "Fetchdata endpoint reached successfully!",
    received_token: accessToken || "No token provided"
  });
});

app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error('Failed to bind to port 3000:', err);
    process.exit(1);
  }
  console.log(`Server is running on http://0.0.0.0:${port}`);
});