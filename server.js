const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/infrastructure/db/db');

// 1. Load Environment Variables
dotenv.config();

// 2. Connect to Database
connectDB();

// 3. Initialize Express App
const app = express();

// 4. Middleware (Allows JSON & Cross-Origin requests)
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// 5. Routes
app.use('/api/auth', require('./src/presentation/routes/authRoutes'));
app.use('/api/users', require('./src/presentation/routes/userRoutes'));
app.use('/api/analytics', require('./src/presentation/routes/analyticsRoutes'));
app.use('/api/home', require('./src/presentation/routes/homeRoutes'));
app.use('/api/transactions', require('./src/presentation/routes/transactionRoutes'));
app.use('/api/categories', require('./src/presentation/routes/categoryRoutes'));
app.use('/api/goals', require('./src/presentation/routes/goalRoutes'));
app.use('/api/groups', require('./src/presentation/routes/groupRoutes'));

// 5. Base Route (Health Check)
app.get('/', (req, res) => {
  res.send('Budget Buddy API is running...');
});

// 6. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});