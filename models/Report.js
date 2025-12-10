const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['pdf', 'excel', 'csv'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  // Optional: If you save the report to the cloud, store the link here
  fileUrl: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);