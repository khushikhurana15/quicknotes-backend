// routes/noteRoutes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Auth middleware for authenticated routes
const noteController = require('../controllers/noteController'); // Your note controller
const cloudinary = require('../config/cloudinaryConfig'); // Path to your Cloudinary config
const multer = require('multer'); // Import multer

// Configure Multer for in-memory storage. This allows the file to be accessed as a buffer
// before sending it to Cloudinary. This is crucial if your existing `upload` middleware
// doesn't already handle memory storage for direct Cloudinary upload.
// If your `../middleware/upload.js` already exports a multer instance
// configured for memoryStorage and passes files to req.file, you might not need this line
// and can just use the imported `upload` from middleware.
// For now, let's assume you'll replace or adapt '../middleware/upload.js' to use this.
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ storage: storage });


// --- PUBLIC ROUTES (No Auth) ---
// This should be at the top or clearly separated
router.get('/public-notes/:shareId', noteController.getPublicNoteByShareId);

// --- AUTHENTICATED ROUTES (With Auth Middleware) ---

// 1. GET ALL NOTES - This needs to come BEFORE any /:id routes
// This handles GET /api/notes
router.get('/', auth, noteController.getAllNotes);

// 2. CREATE A NOTE - Handles POST /api/notes
// This route will now handle file uploads (images, PDFs, videos) using `uploadMiddleware.single('media')`.
// The `noteController.createNote` function needs to be updated to:
//   a) Check for `req.file`.
//   b) Upload `req.file.buffer` to Cloudinary.
//   c) Save the Cloudinary URL (for image, pdf, or video) to the note in MongoDB.
//   d) Handle different `resource_type` for Cloudinary based on file type (e.g., 'image', 'raw' for PDF, 'video').
router.post('/', auth, uploadMiddleware.single('media'), noteController.createNote);


// 3. TEXT-TO-SPEECH - Specific path string
// This handles POST /api/notes/text-to-speech
router.post('/text-to-speech', auth, noteController.textToSpeech);

// 4. SHARE INFO - Specific path string with :noteId
// This handles GET /api/notes/:noteId/share-info
router.get('/:noteId/share-info', auth, noteController.getNoteShareInfo);

// 5. TOGGLE PUBLIC STATUS - Specific path string with :noteId
// This handles POST/DELETE /api/notes/:noteId/share
router.post('/:noteId/share', auth, noteController.toggleNotePublicStatus);
router.delete('/:noteId/share', auth, noteController.toggleNotePublicStatus);

// --- ROUTES WITH DYNAMIC IDs (Place these AFTER static path routes) ---

// *** CRITICAL ADDITION: UPDATE A NOTE ***
// This handles PUT /api/notes/:id
// It also needs to handle file uploads for updates, similar to createNote.
router.put('/:id', auth, uploadMiddleware.single('media'), noteController.updateNote);

// 6. GET SINGLE NOTE BY ID
// This handles GET /api/notes/:id (This one is correctly placed after specific paths)
router.get('/:id', auth, noteController.getNoteById);

// 8. DELETE A NOTE
// This handles DELETE /api/notes/:id (This one is correctly placed after specific paths)
router.delete('/:id', auth, noteController.deleteNote);

// 9. ARCHIVE A NOTE
// This handles PUT /api/notes/:id/archive
router.put('/:id/archive', auth, noteController.archiveNote);

// 10. RESTORE AN ARCHIVED NOTE
// This handles PUT /api/notes/:id/restore
router.put('/:id/restore', auth, noteController.restoreNote);

// 11. PERMANENTLY DELETE AN ARCHIVED NOTE
// This handles DELETE /api/notes/:id/permanently
router.delete('/:id/permanently', auth, noteController.deleteArchivedNotePermanently);

module.exports = router;