const FinancialRecord = require('../models/FinancialRecord');
const User = require('../models/User'); // For updating balance if needed

// @desc    Get Incomes for a specific month
// @route   GET /api/transactions/income
const getIncomes = async (req, res) => {
  try {
    // In real app, use req.user.id
    // const { month, year } = req.query; 
    
    // For now, fetching ALL incomes to keep it simple for the UI demo
    const incomes = await FinancialRecord.find({ type: 'income' }).sort({ date: -1 });
    
    // Calculate totals
    const totalIncome = incomes.reduce((acc, item) => acc + item.amount, 0);

    res.status(200).json({
      transactions: incomes,
      totalIncome: totalIncome,
      balance: 70000 // In real app, calculate dynamic balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new Income
// @route   POST /api/transactions/add
const addTransaction = async (req, res) => {
  try {
    const { userId, amount, categoryName, date, description, type } = req.body;

    // 1. Create the Record
    // Note: In a full app, we look up Category ID. Here we just store the string for simplicity.
    const newRecord = await FinancialRecord.create({
      userId,
      amount,
      type, // 'income' or 'expense'
      date,
      description,
      // For now, we mock categoryId since we haven't built category selection logic yet
      categoryId: "65d4f8a9e4b0a1b2c3d4e5f6", 
      receiptUrl: "" 
    });

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getIncomes, addTransaction };