const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Changed 'fullName' to 'name'
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6
  },
  phoneNumber: {
    type: String,
    default: ""
  },
  profilePicture: {
    type: String,
    default: ""
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);