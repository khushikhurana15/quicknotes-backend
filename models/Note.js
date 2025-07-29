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
  mediaPath: {
    type: String,
  },
  mediaType: { //  field to store 'image', 'video', or 'application' (for PDF)
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
  }, // <--- ADDED COMMA HERE
  isPublic: {
    type: Boolean,
    default: false
  },
  shareId: {
    type: String,
    unique: true, // Ensure share IDs are unique
    sparse: true, // Allows null values, so notes without a shareId don't violate uniqueness
    required: false,
  }
}, { // This closing curly brace closes the schema definition object
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);