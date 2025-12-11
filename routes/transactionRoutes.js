const express = require('express');
const router = express.Router();

// Import functions from Controller
const { 
  getTransactions, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction 
} = require('../controllers/transactionController');

// Define Routes
router.get('/', getTransactions);         // Matches /api/transactions
router.post('/add', addTransaction);      // Matches /api/transactions/add
router.put('/:id', updateTransaction);    // Matches /api/transactions/:id
router.delete('/:id', deleteTransaction); // Matches /api/transactions/:id

module.exports = router;