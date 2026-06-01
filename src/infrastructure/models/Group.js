const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  // The Single Admin of the group
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupName: {
    type: String,
    required: true,
    trim: true
  },
  coverPhoto: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);