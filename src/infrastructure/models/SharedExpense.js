const mongoose = require('mongoose');

const SharedExpenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  // The user who paid/added the bill
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  receiptImage: {
    type: String,
    default: ""
  },
  splitMethod: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal'
  }
}, { timestamps: true });

module.exports = mongoose.model('SharedExpense', SharedExpenseSchema);