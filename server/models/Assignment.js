const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  theme: { type: mongoose.Schema.Types.ObjectId, ref: 'Theme', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['TEST', 'DOCUMENT'], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  startDate: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  maxScore: { type: Number, default: 100 },
  file: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
