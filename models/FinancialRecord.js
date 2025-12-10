const mongoose = require('mongoose');

const FinancialRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  // Is this money coming in or going out?
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model('FinancialRecord', FinancialRecordSchema);