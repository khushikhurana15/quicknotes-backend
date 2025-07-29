// routes/noteRoutes.js (Essential Reordering)

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const noteController = require('../controllers/noteController');
const upload = require('../middleware/upload'); // Assuming you have an upload middleware

// --- PUBLIC ROUTES (No Auth) ---
// This should be at the top or clearly separated
router.get('/public-notes/:shareId', noteController.getPublicNoteByShareId);

// --- AUTHENTICATED ROUTES (With Auth Middleware) ---

// 1. GET ALL NOTES - This needs to come BEFORE any /:id routes
// This handles GET /api/notes
router.get('/', auth, noteController.getAllNotes);

// 2. CREATE A NOTE - Add this if you haven't already. It usually handles POST /api/notes
// This handles POST /api/notes - Assuming it's for creating new notes, and it might involve file uploads
router.post('/', auth, upload.single('media'), noteController.createNote); // Added this assuming you create notes via POST /api/notes

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
// Routes like /:id should be generally at the end of their logical grouping
// to avoid "eating" more specific paths.

// *** CRITICAL ADDITION: UPDATE A NOTE ***
// This handles PUT /api/notes/:id
router.put('/:id', auth, upload.single('media'), noteController.updateNote); // <--- ADD THIS LINE

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