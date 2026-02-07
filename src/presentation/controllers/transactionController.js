const FinancialRecord = require('../../infrastructure/models/FinancialRecord');
const Category = require('../../infrastructure/models/Category');

// @desc    Get Transactions (Search, Filter, Date)
const getTransactions = async (req, res) => {
  try {
    const { month, year, type, categoryId, search, minAmount, maxAmount } = req.query;

    let listQuery = { type: type || 'income' };

    // 1. Category Filter
    if (categoryId) listQuery.categoryId = categoryId;

    // 2. Date Filter
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      listQuery.date = { $gte: start, $lte: end };
    }

    // 3. Search Filter (Description)
    if (search) {
      listQuery.description = { $regex: search, $options: 'i' }; // Case-insensitive
    }

    // 4. Amount Range Filter
    if (minAmount || maxAmount) {
      listQuery.amount = {};
      if (minAmount) listQuery.amount.$gte = Number(minAmount);
      if (maxAmount) listQuery.amount.$lte = Number(maxAmount);
    }

    // Fetch & Populate
    const transactions = await FinancialRecord.find(listQuery)
      .sort({ date: -1 })
      .populate('categoryId', 'categoryName icon color monthlyLimit');

    const listTotal = transactions.reduce((acc, item) => acc + item.amount, 0);

    // Get Category Limit if specific category selected
    let categoryLimit = 0;
    if (categoryId) {
      const cat = await Category.findById(categoryId);
      if (cat) categoryLimit = cat.monthlyLimit;
    }

    // Real-Time Balance (Unchanged logic)
    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentStats = await FinancialRecord.aggregate([
      { $match: { date: { $gte: currStart, $lte: currEnd } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);
    const currIncome = currentStats.find(s => s._id === 'income')?.total || 0;
    const currExpense = currentStats.find(s => s._id === 'expense')?.total || 0;

    res.status(200).json({
      transactions,
      total: listTotal,
      balance: currIncome - currExpense,
      currentMonthIncome: currIncome,
      currentMonthExpense: currExpense,
      categoryLimit
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add Transaction
const addTransaction = async (req, res) => {
  try {
    const { userId, amount, categoryName, categoryId, date, description, type, isRecurring, recurringFrequency } = req.body;

    // Handle File Upload
    let receiptUrl = "";
    if (req.file) {
      // Construct URL based on server address (or use relative path)
      // For simplicity, we store the relative path which the frontend can prepend base_url to
      receiptUrl = `uploads/bills/${req.file.filename}`;
    }

    // Parse Boolean for Multipart Form Data
    const isRecurringBool = isRecurring === 'true' || isRecurring === true;

    // --- LOGIC FIX: Ensure we have a VALID Category ID ---
    let finalCategoryId = categoryId;

    // 1. If no ID provided, try to find by Name & Type
    if (!finalCategoryId) {
      // ... (Existing Category Logic same as before) ...
      let cat = await Category.findOne({ categoryName: categoryName, categoryType: type });
      if (!cat) {
        cat = await Category.findOne({ categoryType: type });
      }
      if (!cat) {
        cat = await Category.create({
          userId: userId || "65d4f8a9e4b0a1b2c3d4e5f6",
          categoryName: "Others",
          categoryType: type,
          icon: "help",
          color: "#CCCCCC",
          isDefault: true
        });
      }
      finalCategoryId = cat._id;
    }

    const newRecord = await FinancialRecord.create({
      userId,
      amount,
      type,
      date,
      description,
      categoryId: finalCategoryId,
      isRecurring: isRecurringBool,
      recurringFrequency: recurringFrequency || 'never',
      receiptUrl: receiptUrl
    });

    res.status(201).json(newRecord);
  } catch (error) {
    console.error("Add Transaction Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Transaction
const updateTransaction = async (req, res) => {
  try {
    const updatedRecord = await FinancialRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedRecord);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Delete Transaction
const deleteTransaction = async (req, res) => {
  try {
    await FinancialRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getTransactions, addTransaction, updateTransaction, deleteTransaction };