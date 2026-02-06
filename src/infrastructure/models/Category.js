const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null },

  categoryName: { 
    type: String, 
    required: true, 
    trim: true },

  categoryType: { 
    type: String, 
    enum: ['income', 'expense'],
    required: true },
 
  icon: { 
    type: String,
    default: "aa" },

  color: { 
    type: String, 
    default: "#00D09E" },

  monthlyLimit: { 
    type: Number, 
    default: 0 },
  
  isDefault: {
    type: Boolean, 
    default: false }
    
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);