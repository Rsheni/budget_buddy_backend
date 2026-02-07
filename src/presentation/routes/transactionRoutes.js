const express = require('express');
const router = express.Router();

// Import functions from Controller
const {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');

const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Define Routes
router.get('/', protect, getTransactions);         // Matches /api/transactions
router.post('/add', protect, upload.single('bill'), addTransaction);      // Matches /api/transactions/add
router.put('/:id', protect, updateTransaction);    // Matches /api/transactions/:id
router.delete('/:id', protect, deleteTransaction); // Matches /api/transactions/:id

module.exports = router;