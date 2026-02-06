const mongoose = require('mongoose');

const FinancialGoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goalName: {
    type: String,
    required: true
  },
  targetAmount: {
    type: Number,
    required: true
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  monthlySavings: {
    type: Number,
    default: 0
  },
  targetDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'achieved', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, { timestamps: true });

module.exports = mongoose.model('FinancialGoal', FinancialGoalSchema);