// // @desc    Get Dashboard Data (Personal, Goals, Shared)
// // @route   GET /api/home
// // @access  Public (For now)

// const getHomeData = async (req, res) => {
//   try {
//     // 1. Define Transactions List
//     const transactions = [
//       { 
//         id: 1, title: 'Salary', date: '18:27 - April 30', amount: 80000, 
//         type: 'income', tag: 'Monthly', icon: '💰' 
//       },
//       { 
//         id: 2, title: 'Groceries', date: '17:00 - April 24', amount: 5000, 
//         type: 'expense', tag: 'Pantry', icon: '🛍️' 
//       },
//       { 
//         id: 3, title: 'Rent', date: '8:30 - April 15', amount: 25000, 
//         type: 'expense', tag: 'Rent', icon: '🔑' 
//       },
//       { 
//         id: 4, title: 'Fuel', date: '8:30 - April 10', amount: 10000, 
//         type: 'expense', tag: 'Car', icon: '⛽' 
//       }
//     ];

//     // 2. Calculate Totals Dynamically
//     let totalIncome = 0;
//     let totalExpense = 0;

//     transactions.forEach(t => {
//       if (t.type === 'income') {
//         totalIncome += t.amount;
//       } else {
//         totalExpense += t.amount;
//       }
//     });

//     // 3. Calculate Current Wallet Balance
//     const currentBalance = totalIncome - totalExpense;

//     // 4. Construct Response
//     const mockData = {
//       personal: {
//         balance: currentBalance,
//         totalIncome: totalIncome,   // Send this to frontend
//         totalExpense: totalExpense, // Send this to frontend
//         currency: 'Rs.',
//         transactions: transactions
//       },

//       // 2. Goal Status Tab Data
//       goals: {
//         totalSavings: 20000,
//         currency: 'Rs.',
//         list: [
//           { 
//             id: 1, 
//             name: 'Laptop', 
//             current: 5000, 
//             target: 10000, 
//             icon: '💻' 
//           },
//           { 
//             id: 2, 
//             name: 'New Car', 
//             current: 10000, 
//             target: 500000, 
//             icon: '🚗' 
//           }
//         ]
//       },

//       // 3. Shared Tab Data
//       shared: {
//         youOwe: 5000,
//         owedToYou: 2000,
//         currency: 'Rs.',
//         groups: [
//           { 
//             id: 1, 
//             name: 'Family Trip', 
//             role: 'Group Creator', 
//             userOwes: 2000, 
//             totalSpend: 20000 
//           },
//           { 
//             id: 2, 
//             name: 'Office Lunch Club', 
//             role: 'Member', 
//             userOwes: 1500, 
//             received: 500 
//           },
//           { 
//             id: 3, 
//             name: 'Friends Hangouts', 
//             role: 'Member', 
//             userOwes: 0, 
//             received: 3800 
//           }
//         ]
//       }
//     };

//     // Send data to frontend with 200 OK status
//     res.status(200).json(mockData);

//   } catch (error) {
//     console.error("Error in Home Controller:", error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// module.exports = { getHomeData };

const FinancialRecord = require('../../infrastructure/models/FinancialRecord');
const FinancialGoal = require('../../infrastructure/models/FinancialGoal');
const SharedExpense = require('../../infrastructure/models/SharedExpense');

// @desc    Get Real Dashboard Data (Personal, Goals, Shared)
// @route   GET /api/home
const getHomeData = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. CALCULATE WALLET BALANCE (All Time) for Logged In User
    const balanceStats = await FinancialRecord.aggregate([
      { $match: { userId: userId } }, // Filter by User
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    const totalIncome = balanceStats.find(s => s._id === 'income')?.total || 0;
    const totalExpense = balanceStats.find(s => s._id === 'expense')?.total || 0;
    const currentBalance = totalIncome - totalExpense;

    // Calculate Savings Percentage for Progress Bar
    // (Current Balance / Total Income) * 100
    let savingsPercentage = 0;
    if (totalIncome > 0) {
      savingsPercentage = Math.round((currentBalance / totalIncome) * 100);
    }
    // Clamp between 0 and 100
    if (savingsPercentage < 0) savingsPercentage = 0;
    if (savingsPercentage > 100) savingsPercentage = 100;


    // 2. FETCH RECENT TRANSACTIONS (Limit 5) for Logged In User
    // We populate 'categoryId' to get the icon and color dynamically
    const recentTransactions = await FinancialRecord.find({ userId: userId })
      .sort({ date: -1 }) // Newest first
      .limit(5)
      .populate('categoryId', 'categoryName icon color');

    // Format transactions for the Frontend
    const formattedTransactions = recentTransactions.map(t => {
      const dateObj = new Date(t.date);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        id: t._id,
        title: t.description,
        date: dateStr,
        amount: t.type === 'expense' ? -Math.abs(t.amount) : t.amount,
        type: t.type,
        tag: t.categoryId ? t.categoryId.categoryName : 'General', // Dynamic Tag
        icon: t.categoryId ? t.categoryId.icon : 'star',           // Dynamic Icon
        color: t.categoryId ? t.categoryId.color : '#00D09E'       // Dynamic Color
      };
    });


    // 3. FETCH GOALS for Logged In User
    const goals = await FinancialGoal.find({ userId: userId });
    
    let totalSavings = 0;
    const goalList = goals.map(g => {
      totalSavings += g.currentAmount;
      const percentage = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
      
      // Map icons based on category
      let iconType = 'wallet-outline';
      if (g.category === 'Travel') iconType = 'beach';
      else if (g.category === 'Tech') iconType = 'laptop';
      else if (g.category === 'Car') iconType = 'car-outline';
      else if (g.category === 'Home') iconType = 'home-outline';

      return {
        id: g._id,
        title: g.goalName,
        savedAmount: g.currentAmount,
        targetAmount: g.targetAmount,
        percentage: percentage,
        iconType: iconType,
        daysRemaining: g.targetDate 
          ? `${Math.ceil((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining` 
          : 'No deadline set'
      };
    });

    const goalsData = {
      totalSavings: totalSavings,
      currency: 'Rs.',
      list: goalList
    };

    const sharedData = {
      youOwe: 0,
      owedToYou: 0,
      currency: 'Rs.',
      groups: []
    };


    // 4. SEND FINAL RESPONSE
    const responseData = {
      personal: {
        balance: currentBalance,
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        savingsPercentage: savingsPercentage, // Send % for Progress Bar
        currency: 'Rs.',
        transactions: formattedTransactions
      },
      goals: goalsData,
      shared: sharedData
    };

    res.status(200).json(responseData);

  } catch (error) {
    console.error("Error in Home Controller:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getHomeData };