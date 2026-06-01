const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  settlementDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'declined'],
    default: 'completed'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank'],
    default: 'cash'
  },
  notes: {
    type: String,
    default: ""
  },
  bankDetails: {
    accountNumber: String,
    bankName: String,
    branchName: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Settlement', SettlementSchema);