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

const FinancialRecord = require('../models/FinancialRecord');
const FinancialGoal = require('../models/FinancialGoal'); // If you implement goals later
const SharedExpense = require('../models/SharedExpense'); // If you implement groups later

// @desc    Get Real Dashboard Data (Personal, Goals, Shared)
// @route   GET /api/home
const getHomeData = async (req, res) => {
  try {
    // 1. CALCULATE WALLET BALANCE (All Time)
    const balanceStats = await FinancialRecord.aggregate([
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);
    const totalIncome = balanceStats.find(s => s._id === 'income')?.total || 0;
    const totalExpense = balanceStats.find(s => s._id === 'expense')?.total || 0;
    const currentBalance = totalIncome - totalExpense;


    // 2. FETCH RECENT TRANSACTIONS (Limit 5)
    // We populate 'categoryId' to get the icon and color dynamically
    const recentTransactions = await FinancialRecord.find()
      .sort({ date: -1 }) // Newest first
      .limit(5)
      .populate('categoryId', 'categoryName icon color'); 

    // Format transactions for the Frontend
    const formattedTransactions = recentTransactions.map(t => ({
      id: t._id,
      title: t.description,
      date: new Date(t.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      amount: t.amount,
      type: t.type,
      tag: t.categoryId ? t.categoryId.categoryName : 'General', // Dynamic Tag
      icon: t.categoryId ? t.categoryId.icon : 'star',           // Dynamic Icon
      color: t.categoryId ? t.categoryId.color : '#00D09E'       // Dynamic Color
    }));


    // 3. GOALS & SHARED (Placeholder for now until you build those screens)
    // In a real app, you would query FinancialGoal.find() and SharedExpense.find() here.
    const goalsData = {
      totalSavings: 0,
      currency: 'Rs.',
      list: [] 
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