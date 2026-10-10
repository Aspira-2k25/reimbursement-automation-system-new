const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true },
  publicId: { type: String, required: true, unique: true },
  resourceType: { type: String, default: 'image' },
  deliveryType: { type: String, default: 'authenticated' },
  format: String,
  applicationId: String,
}, { timestamps: true });
module.exports = mongoose.model('Attachment', schema);
