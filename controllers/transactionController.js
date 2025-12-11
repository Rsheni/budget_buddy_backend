const FinancialRecord = require('../models/FinancialRecord');

// @desc    Get Transactions (Selected Month) & Balance (Current Real-Time Month)
const getTransactions = async (req, res) => {
  try {
    const { month, year, type } = req.query;

    // --- PART 1: The Transaction List (Dynamic based on User Selection) ---
    let listQuery = { type: type || 'income' };
    
    if (month && year) {
      const listStartDate = new Date(year, month - 1, 1);
      const listEndDate = new Date(year, month, 0, 23, 59, 59);
      listQuery.date = { $gte: listStartDate, $lte: listEndDate };
    }

    const transactions = await FinancialRecord.find(listQuery).sort({ date: -1 });
    const listTotal = transactions.reduce((acc, item) => acc + item.amount, 0);

    // --- PART 2: The Wallet Balance (Static - ALWAYS Current Month) ---
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthStats = await FinancialRecord.aggregate([
      {
        $match: {
          date: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    const currIncome = currentMonthStats.find(s => s._id === 'income')?.total || 0;
    const currExpense = currentMonthStats.find(s => s._id === 'expense')?.total || 0;
    const currentMonthBalance = currIncome - currExpense;

    // --- PART 3: Send Response ---
    res.status(200).json({
      transactions: transactions,
      total: listTotal,
      balance: currentMonthBalance,
      currentMonthIncome: currIncome, 
      currentMonthExpense: currExpense
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add Transaction
const addTransaction = async (req, res) => {
  try {
    const newRecord = await FinancialRecord.create({
      ...req.body,
      categoryId: "65d4f8a9e4b0a1b2c3d4e5f6", // Mock ID
      receiptUrl: "" 
    });
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRecord = await FinancialRecord.findByIdAndUpdate(
      id, 
      req.body, 
      { new: true }
    );
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    await FinancialRecord.findByIdAndDelete(id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// *** THIS PART WAS MISSING OR INCORRECT BEFORE ***
module.exports = { 
  getTransactions, 
  addTransaction, 
  updateTransaction, 
  deleteTransaction 
};