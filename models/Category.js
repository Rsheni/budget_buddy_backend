const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  // If null, it is a System Default category visible to everyone
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  categoryName: {
    type: String,
    required: true,
    trim: true
  },
  categoryType: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  icon: {
    type: String,
    default: "default-icon"
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);