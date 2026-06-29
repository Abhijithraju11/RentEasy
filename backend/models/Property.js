const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Hostel', 'PG', 'House'], required: true },
  rent: { type: Number, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  contact: { type: String, required: true },
  image: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema);
