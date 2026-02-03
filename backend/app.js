import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { router as authRoutes } from "./auth.js";
import omronAuth from "./routes/omron/omronAuth.js";
import omronCallback from "./routes/omron/omronCallback.js";
import fitbitRoutes from "./fitbit.js";
import bloodLipids from "./routes/bloodLipids.js";
import bloodSugar from "./routes/bloodSugar.js";
import bmi from "./routes/bmi.js";
import diet from "./routes/diet.js";
import smoking from "./routes/smoking.js";
import healthScores from "./routes/healthScores.js";
import { router as userGoalsRouter } from "./routes/userGoals.mjs";

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'],       
    credentials: false                
  }));

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/omronAuth", omronAuth.router);
app.use("/api/omronCallback", omronCallback.router);
app.use('/api/fitbitAuth', fitbitRoutes);
app.use('/api/blood-lipids', bloodLipids.router);
app.use('/api/blood-sugar', bloodSugar.router);
app.use('/api/bmi', bmi.router);
app.use('/api/diet', diet.router);
app.use('/api/smoking', smoking.router);
app.use('/api/health-scores', healthScores.router);
app.use('/api/user-goals', userGoalsRouter);

const PORT = process.env.PORT || 3000;

const port = PORT;

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