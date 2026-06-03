const mongoose = require('mongoose');

const ExpenseSplitSchema = new mongoose.Schema({
  sharedExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedExpense',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splitAmount: {
    type: Number,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseSplit', ExpenseSplitSchema);