// routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const { getPublicNoteByShareId } = require('../controllers/noteController'); // Import only the public controller

// @route   GET /api/public-notes/:shareId
// @access  Public
router.get('/:shareId', getPublicNoteByShareId);

module.exports = router;