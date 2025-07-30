// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  mediaPath: { // This will store the Cloudinary URL for any media type
    type: String,
  },
  mediaType: { // This will store 'image', 'video', or 'application' (for PDF)
    type: String,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  tags: {
    type: [String],
    default: [],
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shareId: {
    type: String,
    unique: true,
    sparse: true,
    required: false,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);