const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Theme', themeSchema);
