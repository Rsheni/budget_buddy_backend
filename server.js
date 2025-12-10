const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// 1. Load Environment Variables
dotenv.config();

// 2. Connect to Database
connectDB();

// 3. Initialize Express App
const app = express();

// 4. Middleware (Allows JSON & Cross-Origin requests)
app.use(express.json());
app.use(cors());

// 5. Routes
app.use('/api/home', require('./routes/homeRoutes')); 
app.use('/api/transactions', require('./routes/transactionRoutes'));

// 5. Base Route (Health Check)
app.get('/', (req, res) => {
  res.send('Budget Buddy API is running...');
});

// 6. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});