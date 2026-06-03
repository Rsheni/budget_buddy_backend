Here is the Updated Master README.md.

I have updated the Project Structure, Backend Logic (specifically the Transaction Controller), API Endpoints, and Frontend Screens section to reflect the latest "Expense Manager" features we built.

You can overwrite your current file with this content.

# 💰 Budget Buddy - Full Stack Finance App

**Budget Buddy** is a comprehensive personal finance and group expense tracking application. It is built using a modern **MERN Stack** (MongoDB, Express, React Native, Node.js) with a **Clean Architecture** backend.

---

## 🏗️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React Native (CLI)** | Cross-platform mobile app (Android/iOS) |
| **Backend** | **Node.js + Express** | Scalable REST API |
| **Database** | **MongoDB Atlas** | Cloud NoSQL Database |
| **ODM** | **Mongoose** | Schema validation & Data modeling |
| **Auth** | **JWT + Bcrypt** | Secure Authentication (Planned) |
| **Version Control** | **Git** | Hosted on GitHub (`development` branch) |

---

## 📂 Project Structure

To avoid Windows path length issues, the project is hosted at: `C:\dev\FinanceProject`


FinanceProject/
│
├── backend/                # Node.js API Server
│   ├── config/             # Database connection (db.js)
│   ├── controllers/        # Business Logic
│   │   ├── homeController.js       # Dashboard Mock Data
│   │   └── transactionController.js # Real-time Income/Expense Logic
│   ├── models/             # Database Schemas (12 Models)
│   ├── routes/             # API Endpoints
│   │   ├── homeRoutes.js
│   │   └── transactionRoutes.js
│   ├── .env                # Secrets (PORT, MONGO_URI) - Ignored by Git
│   ├── server.js           # Main Entry Point
│   └── package.json        # Dependencies
│
└── frontend/               # React Native App
    ├── src/
    │   ├── api/            # API Services (homeService, transactionService)
    │   ├── components/     # Reusable UI (BalanceCard, CustomBottomNav)
    │   ├── constants/      # Colors & Theme
    │   ├── navigation/     # App Navigation (Stack & Bottom Tabs)
    │   └── screens/        # UI Pages
    │       ├── LaunchScreen/
    │       ├── WelcomeScreen/
    │       ├── HomeScreen/         # Main Dashboard
    │       ├── TransactionScreen/  # Income/Expense List & Filter
    │       └── AddIncomeScreen/    # Dynamic Form (Add/Edit)
    ├── App.tsx             # Main Application Entry
    └── package.json        # Dependencies

### ⚙️ Backend Implementation Details

## 🖥️ BACKEND (Node.js + Express + MongoDB)

# 1. Entry Point: backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// 1. Load Config
dotenv.config();

// 2. Connect to Database
connectDB();

// 3. Initialize App
const app = express();

// 4. Middleware
app.use(express.json());
app.use(cors());

// 5. Routes
app.use('/api/home', require('./routes/homeRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));

// Base Route
app.get('/', (req, res) => {
  res.send('Budget Buddy API is running...');
});

// 6. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

# 2. Database Connection: backend/config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

## 🗄️ Backend Controllers
# 3. Transaction Logic: backend/controllers/transactionController.js
Handles adding income/expense, filtering by date, and calculating real-time wallet balance.

const FinancialRecord = require('../models/FinancialRecord');

// @desc    Get Transactions (Filtered) & Real-Time Balance
const getTransactions = async (req, res) => {
  try {
    const { month, year, type } = req.query;

    // 1. Filter List by User Selection
    let listQuery = { type: type || 'income' };
    
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      listQuery.date = { $gte: start, $lte: end };
    }

    const transactions = await FinancialRecord.find(listQuery).sort({ date: -1 });

    // 2. Calculate Real-Time Wallet Balance (All Time)
    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const stats = await FinancialRecord.aggregate([
      { $match: { date: { $gte: currStart, $lte: currEnd } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } }
    ]);

    const income = stats.find(s => s._id === 'income')?.total || 0;
    const expense = stats.find(s => s._id === 'expense')?.total || 0;

    res.status(200).json({
      transactions: transactions,
      balance: income - expense, // Real-time Balance
      currentMonthIncome: income,
      currentMonthExpense: expense
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
      categoryId: "65d4f8a9e4b0a1b2c3d4e5f6", // Mock Category ID
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
    const updatedRecord = await FinancialRecord.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Transaction
const deleteTransaction = async (req, res) => {
  try {
    await FinancialRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTransactions, addTransaction, updateTransaction, deleteTransaction };

## 4. Home Logic: backend/controllers/homeController.js
(Mock Data for Dashboard Overview)

const getHomeData = async (req, res) => {
  try {
    // Mock Data for Dashboard
    const mockData = {
      personal: {
        balance: 70000, // This should eventually be calculated like transactionController
        transactions: [] 
      },
      goals: { totalSavings: 20000, list: [] },
      shared: { youOwe: 5000, owedToYou: 2000, groups: [] }
    };
    res.status(200).json(mockData);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
module.exports = { getHomeData };
🛣️ Backend Routes
5. Transaction Routes: backend/routes/transactionRoutes.js

const express = require('express');
const router = express.Router();
const { 
  getTransactions, addTransaction, updateTransaction, deleteTransaction 
} = require('../controllers/transactionController');

router.get('/', getTransactions);
router.post('/add', addTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;

🗄️ Database Models (Schemas)

We strictly follow a Normalized Database Design.

1. User (models/User.js)

const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  phoneNumber: { type: String, default: "" },
  profilePicture: { type: String, default: "" },
  lastLogin: { type: Date, default: Date.now }
}, { timestamps: true });
module.exports = mongoose.model('User', UserSchema);
2. FinancialRecord (models/FinancialRecord.js)

const mongoose = require('mongoose');
const FinancialRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  date: { type: Date, default: Date.now, required: true },
  description: { type: String, trim: true },
  receiptUrl: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model('FinancialRecord', FinancialRecordSchema);
3. Category (models/Category.js)

const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  categoryName: { type: String, required: true },
  categoryType: { type: String, enum: ['income', 'expense'], required: true },
  icon: { type: String, default: "default-icon" },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('Category', CategorySchema);

(Other models: Group, GroupMember, Budget, FinancialGoal, SharedExpense, ExpenseSplit, Settlement, Notification, Report - Configured as per ER Diagram)

## 📱 Frontend Setup & Running Guide
# Environment Requirements

Node.js v18+

JDK 17

Android Studio (SDK 35)

Scenario A: Using Virtual Emulator

Open Android Studio -> Virtual Device Manager -> Launch Pixel 7.

Open Terminal #1 at frontend/:

npm start

Open Terminal #2 at frontend/:

npm run android

Troubleshooting Red Screen:
If the app opens but shows "Unable to load script":

adb reverse tcp:8081 tcp:8081

Then press R twice on the keyboard to reload.

Scenario B: Using Real Physical Phone

Enable Developer Mode on phone (Tap Build Number 7 times).

Enable USB Debugging in Settings.

Connect via USB cable.

Verify connection:

adb devices
# Must show: List of devices attached -> RZ8N... device

Run commands:
npm start         # Terminal 1
npm run android   # Terminal 2

### FRONTEND (React Native)
# 1. Colors: src/constants/colors.ts

export const COLORS = {
  primary: '#00D09E',
  primaryDark: '#0E3E3E',
  textDark: '#093030',
  textLight: '#898989',
  background: '#F1FFF3',
  white: '#FFFFFF',
  cardWhite: '#FFFFFF',
  cardBackground: '#DFF7E2',
  blue: '#3299FF',
  lightBlue: '#6DB6FE',
  activeIconBg: '#00D09E',
  inactiveIcon: '#093030',
  progressBg: '#333333',
  progressFill: '#FFFFFF',
};

## 2. API Service: src/api/transactionService.ts

const API_URL = 'http://10.0.2.2:5000/api/transactions'; 

export const fetchTransactions = async (month: number, year: number, type: string) => {
  try {
    const response = await fetch(`${API_URL}?month=${month}&year=${year}&type=${type}`);
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const addIncome = async (data: any) => {
  try {
    const response = await fetch(`${API_URL}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) { return null; }
};

export const updateIncome = async (id: string, data: any) => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) { return null; }
};

export const deleteIncome = async (id: string) => {
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    return true;
  } catch (error) { return false; }
};

# 3. Transaction Screen: src/screens/TransactionScreen/TransactionScreen.tsx
The Dashboard for Income/Expenses.

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { fetchTransactions } from '../../api/transactionService';
import CustomBottomNav from '../../components/Navigation/CustomBottomNav';

const TransactionScreen = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [viewType, setViewType] = useState<'income' | 'expense'>('income');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const month = currentDate.getMonth() + 1; 
        const year = currentDate.getFullYear();
        const result = await fetchTransactions(month, year, viewType);
        setData(result);
      };
      load();
    }, [currentDate, viewType])
  );

  const isExpense = viewType === 'expense';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
           <TouchableOpacity onPress={() => navigation.goBack()}>
             <Image source={{ uri: 'https://img.icons8.com/ios/50/093030/left.png' }} style={styles.navIcon} />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>Transaction</Text>
           <View style={styles.navIcon}><Text>🔔</Text></View>
        </View>

        {/* Real-Time Balance */}
        <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Current Balance Of Your Wallet</Text>
            <Text style={styles.balanceAmount}>Rs. {data?.balance?.toLocaleString() || "0"}</Text>
            <View style={styles.progressBarBg}>
                <View style={styles.progressPill}><Text style={styles.progressText}>30%</Text></View>
                <Text style={styles.targetText}>Rs. {data?.currentMonthIncome?.toLocaleString() || "0"}</Text>
            </View>
        </View>

        {/* Income/Expense Toggle */}
        <View style={styles.statsRow}>
            <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: isExpense ? COLORS.white : COLORS.blue }]}
                onPress={() => setViewType('income')}
            >
                <Text style={[styles.statLabel, { color: isExpense ? COLORS.textDark : COLORS.white }]}>Income</Text>
                <Text style={[styles.statAmount, { color: isExpense ? COLORS.blue : COLORS.white }]}>
                    Rs. {data?.currentMonthIncome?.toLocaleString() || "0"}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.statCard, { backgroundColor: isExpense ? COLORS.blue : COLORS.white }]}
                onPress={() => setViewType('expense')}
            >
                <Text style={[styles.statLabel, { color: isExpense ? COLORS.white : COLORS.textDark }]}>Expense</Text>
                <Text style={[styles.statAmount, { color: isExpense ? COLORS.white : COLORS.blue }]}>
                    Rs. {data?.currentMonthExpense?.toLocaleString() || "0"}
                </Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <View style={styles.listContainer}>
        <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Month</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={styles.dateText}>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            </TouchableOpacity>
        </View>
        {showPicker && <DateTimePicker value={currentDate} mode="date" onChange={(e, d) => { setShowPicker(false); if(d) setCurrentDate(d); }} />}

        <ScrollView>
          {data?.transactions?.map((item: any) => (
            <TouchableOpacity key={item._id} style={styles.row} onPress={() => navigation.navigate('AddIncome', { incomeToEdit: item, type: viewType })}>
                <View style={{flex: 1}}>
                    <Text style={styles.rowTitle}>{item.description}</Text>
                    <Text style={styles.rowPercent}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.rowAmount, isExpense && { color: '#FF4D4D' }]}>Rs. {item.amount}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddIncome', { type: viewType })}><Text style={styles.fabText}>+</Text></TouchableOpacity>
      <CustomBottomNav activeTab="Swap" navigation={navigation} />
    </View>
  );
};

// ... Styles hidden for brevity ...
export default TransactionScreen;

## 4. Add Income Screen: src/screens/AddIncomeScreen/AddIncomeScreen.tsx
Dynamic form for adding both Income and Expense.

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, StatusBar, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import { addIncome, updateIncome, deleteIncome } from '../../api/transactionService';
import CustomBottomNav from '../../components/Navigation/CustomBottomNav';

const INCOME_CATEGORIES = [{ id: 1, name: 'Salary', icon: '💰' }, { id: 2, name: 'Gift', icon: '🎁' }];
const EXPENSE_CATEGORIES = [{ id: 1, name: 'Food', icon: '🍔' }, { id: 2, name: 'Transport', icon: '🚌' }];

const AddIncomeScreen = ({ navigation, route }: any) => {
  const { incomeToEdit, type = 'income' } = route.params || {};
  const isEditMode = !!incomeToEdit;
  const isExpense = type === 'expense';

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const categories = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const [category, setCategory] = useState(categories[0].name);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setAmount(incomeToEdit.amount.toString());
      setTitle(incomeToEdit.description);
      setCategory(incomeToEdit.categoryName);
      setDate(new Date(incomeToEdit.date));
    }
  }, [isEditMode]);

  const handleSave = async () => {
    if (!amount || !title) return Alert.alert("Error", "Missing Info");
    const data = { userId: "65d4...", amount: parseFloat(amount), categoryName: category, date, description: title, type };
    
    if (isEditMode) await updateIncome(incomeToEdit._id, data);
    else await addIncome(data);
    navigation.goBack();
  };

  const handleDelete = async () => {
    await deleteIncome(incomeToEdit._id);
    navigation.goBack();
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      <View style={styles.greenHeaderBg} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text>←</Text></TouchableOpacity>
            <Text>{isEditMode ? `Edit ${isExpense ? 'Expense' : 'Income'}` : `Add ${isExpense ? 'Expense' : 'Income'}`}</Text>
            {isEditMode && <TouchableOpacity onPress={handleDelete}><Text>🗑️</Text></TouchableOpacity>}
        </View>
        <View style={styles.formContainer}>
            {/* Form Inputs Here (Date, Category, Amount, Title) */}
            <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
            <TouchableOpacity onPress={handleSave}><Text>Save</Text></TouchableOpacity>
        </View>
      </ScrollView>
      <CustomBottomNav activeTab="Swap" navigation={navigation} />
    </View>
  );
};
// ... Styles hidden for brevity ...
export default AddIncomeScreen;


## 📝 Git Workflow

Pushing new code to development:

git add .
git commit -m "Description of work"
git push origin development
