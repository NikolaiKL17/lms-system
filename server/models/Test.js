const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
