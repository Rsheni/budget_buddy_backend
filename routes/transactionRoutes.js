const express = require('express');
const router = express.Router();
const { getIncomes, addTransaction } = require('../controllers/transactionController');

router.get('/income', getIncomes);
router.post('/add', addTransaction);

module.exports = router;