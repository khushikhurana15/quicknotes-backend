// controllers/noteController.js

const Note = require('../models/Note'); // This line should only appear ONCE at the top
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose'); // Import mongoose to validate ObjectId
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique IDs

// Get all notes for the authenticated user (now handles archived status)
exports.getAllNotes = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available from authentication middleware
    const { showArchived } = req.query; // New query parameter

    let query = { user: userId, isArchived: false }; // Default: get non-archived notes

    if (showArchived === 'true') {
      query = { user: userId, isArchived: true }; // If requested, get only archived
    } else if (showArchived === 'all') {
      query = { user: userId }; // Get all notes (archived and non-archived)
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { title, content, mediaPath, mediaType, isPinned, tags } = req.body;
    const newNote = new Note({
      title,
      content,
      user: req.user.id,
      mediaPath,
      mediaType,
      isPinned: isPinned !== undefined ? isPinned : false,
      tags: Array.isArray(tags) ? tags : []
    });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get all notes for the authenticated user (NOTE: this might be redundant with getAllNotes now)
// Keeping it for now, but consider consolidating with getAllNotes if not specifically used elsewhere.
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user.id })
                            .sort({ isPinned: -1, createdAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get a single note by ID (private, for authenticated user)
exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.status(200).json(note);
  } catch (error) {
    console.error('Error fetching note by ID:', error.message);
    res.status(500).json({ message: 'Server error.', error: error.message }); // Added error detail
  }
};

// --- NEW: Controller Functions for Public Sharing Management ---

// @desc    Get share info for a specific note (for the creator)
// @route   GET /api/notes/:noteId/share-info
// @access  Private (only creator can see this info)
exports.getNoteShareInfo = async (req, res) => {
    try {
        const { noteId } = req.params;

        // Validate if the ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }

        // Find the note belonging to the authenticated user
        const note = await Note.findOne({ _id: noteId, user: req.user.id });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or you are not authorized.' });
        }

        // Return whether it's public and its shareId
        res.json({ isPublic: note.isPublic, shareId: note.shareId });

    } catch (error) {
        console.error('Error fetching note share info:', error.message);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// @desc    Generate/Toggle public share link for a note
// @route   POST /api/notes/:noteId/share (to enable/generate)
// @route   DELETE /api/notes/:noteId/share (to disable)
// @access  Private (only creator can do this)
exports.toggleNotePublicStatus = async (req, res) => {
    try {
        const { noteId } = req.params;

        // Validate if the ID is a valid MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }

        const note = await Note.findOne({ _id: noteId, user: req.user.id });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or you are not authorized.' });
        }

        if (req.method === 'POST') {
            // Logic to ENABLE sharing (or generate if not exists)
            // Generate a new shareId only if one doesn't exist
            if (!note.shareId) {
                let newShareId;
                let isUnique = false;
                // Loop to ensure the generated shareId is truly unique in the database
                while (!isUnique) {
                    newShareId = uuidv4();
                    const existingNoteWithShareId = await Note.findOne({ shareId: newShareId });
                    if (!existingNoteWithShareId) {
                        isUnique = true;
                    }
                }
                note.shareId = newShareId;
            }
            note.isPublic = true; // Mark the note as public
            await note.save();
            res.status(200).json({ message: 'Note made public', shareId: note.shareId });

        } else if (req.method === 'DELETE') {
            // Logic to DISABLE sharing
            note.isPublic = false;
            note.shareId = undefined; // Remove the shareId
            await note.save();
            res.status(200).json({ message: 'Note sharing disabled' });
        } else {
            // If any other method hits this route, return Method Not Allowed
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

    } catch (error) {
        console.error('Error toggling note public status:', error.message);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// @desc    Get a public note by shareId (for public access, NO AUTH)
// @route   GET /api/public-notes/:shareId
// @access  Public (No authentication middleware, hence the separate route)
exports.getPublicNoteByShareId = async (req, res) => {
    try {
        const { shareId } = req.params;

        // Find the note by its unique shareId AND ensure it's marked as public
        const note = await Note.findOne({ shareId: shareId, isPublic: true });

        if (!note) {
            // If note not found by shareId or not marked public, return 404
            return res.status(404).json({ message: 'Note not found or not public.' });
        }

        // Return only necessary public fields (strip sensitive user data or unnecessary internal flags)
        const publicNote = {
            _id: note._id, // Keep _id if useful for frontend, but shareId is primary for lookup
            title: note.title,
            content: note.content,
            // Ensure mediaPath includes the full API_URL for public access.
            // process.env.REACT_APP_API_URL should be set in your .env file
            mediaPath: note.mediaPath ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${note.mediaPath}` : null,
            mediaType: note.mediaType,
            tags: note.tags,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            // Do NOT include sensitive fields like user ID, isPinned, isArchived, etc.
        };

        res.status(200).json(publicNote);

    } catch (error) {
        console.error('Error fetching public note by shareId:', error.message);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};

// --- END NEW Controller Functions for Public Sharing Management ---

// Update a note
exports.updateNote = async (req, res) => {
  try {
    const { title, content, isPinned } = req.body;
    // 'tags' will be handled dynamically based on its presence in req.body

    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found or not authorized' });
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (isPinned !== undefined) {
      note.isPinned = isPinned;
    }

    // --- CRITICAL FIX FOR TAGS (Corrected Structure) ---
    let updatedTags = [];

    // Check if tags are explicitly provided in the request body
    if (req.body.tags !== undefined) {
        let incomingTags = req.body.tags;

        // Frontend sends FormData. If multiple tags, it's an array. If one, it might be a string.
        // It's also possible that `req.body.tags` itself is a stringified array if frontend did JSON.stringify
        // Handle potential stringification from frontend or previous corruption.
        while (typeof incomingTags === 'string' && incomingTags.startsWith('[') && incomingTags.endsWith(']')) {
            try {
                incomingTags = JSON.parse(incomingTags);
            } catch (e) {
                console.error("Backend Update: Failed to parse incoming tags string during unwrapping:", req.body.tags, e);
                incomingTags = []; // Parsing failed for incoming, default to empty
                break;
            }
        }

        // Ensure it's an array after parsing, and map/trim individual tags
        if (Array.isArray(incomingTags)) {
            updatedTags = incomingTags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag)).filter(tag => tag !== '');
        } else if (typeof incomingTags === 'string' && incomingTags.trim() !== '') {
            // If it's a single non-array string tag (e.g., "work,urgent" or just "singleTag")
            updatedTags = incomingTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        } else {
            updatedTags = [];
        }
    } else {
        // If req.body.tags is undefined (meaning tags were not part of the update request),
        // we need to ensure existing tags from the database are clean.
        // This is crucial for the "VOICE !!" note that's already corrupted.
        let existingTags = note.tags; // Get tags currently associated with the note (from DB)

        while (typeof existingTags === 'string' && existingTags.startsWith('[') && existingTags.endsWith(']')) {
            try {
                existingTags = JSON.parse(existingTags);
            } catch (e) {
                console.error("Backend Update: Failed to parse existing tags string during unwrapping:", note.tags, e);
                existingTags = []; // Parsing failed for existing, default to empty
                break;
            }
        }

        if (Array.isArray(existingTags)) {
            updatedTags = existingTags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag)).filter(tag => tag !== '');
        } else if (typeof existingTags === 'string' && existingTags.trim() !== '') {
            updatedTags = existingTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        } else {
            updatedTags = [];
        }
    }

    // Assign the cleaned and processed tags to the note object
    note.tags = updatedTags;
    // --- END CRITICAL FIX FOR TAGS ---


    // Media handling logic
    if (req.body.removeMedia === 'true') {
      // If a new file is also uploaded in the same request, the new file takes precedence
      // We only remove if there's no new file being uploaded
      if (!req.file) {
        // Optionally, delete the old file from the file system
        if (note.mediaPath && fs.existsSync(path.join(__dirname, '..', note.mediaPath))) {
          fs.unlinkSync(path.join(__dirname, '..', note.mediaPath));
        }
        note.mediaPath = undefined;
        note.mediaType = undefined;
      }
    }

    if (req.file) {
      // If there was an old media file, delete it first
      if (note.mediaPath && fs.existsSync(path.join(__dirname, '..', note.mediaPath))) {
        fs.unlinkSync(path.join(__dirname, '..', note.mediaPath));
      }
      note.mediaPath = `/uploads/${req.file.filename}`;
      note.mediaType = req.file.mimetype.startsWith('image/') ? 'image' :
                       req.file.mimetype.startsWith('video/') ? 'video' :
                       req.file.mimetype === 'application/pdf' ? 'application' : null;
    }

    const updatedNote = await note.save();
    res.status(200).json(updatedNote);
  } catch (error) {
    console.error('Error updating note in backend:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a note
exports.deleteNote = async (req, res) => {
  try {
    const deletedNote = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deletedNote) return res.status(404).json({ message: 'Note not found or not authorized' });
    // TODO: Consider deleting associated media files from 'uploads' directory
    res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Text-to-Speech Controller Function
exports.textToSpeech = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ msg: 'No text provided for speech conversion.' });
  }

  const audioDir = path.join(__dirname, '../temp_audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
  }

  const audioFileName = `speech-${Date.now()}.mp3`;
  const audioFilePath = path.join(audioDir, audioFileName);

  try {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, '../tts_script.py'),
      text,
      audioFilePath
    ]);

    let errorData = '';
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}. Error: ${errorData}`);
        if (fs.existsSync(audioFilePath)) {
          fs.unlink(audioFilePath, (unlinkErr) => { if (unlinkErr) console.error('Error cleaning up incomplete audio file:', unlinkErr); });
        }
        return res.status(500).json({ msg: `Text-to-speech conversion failed: ${errorData || 'Unknown error'}` });
      }

      res.sendFile(audioFilePath, (err) => {
        if (err) {
          console.error('Error sending audio file:', err);
          return res.status(500).json({ msg: 'Failed to send audio file.' });
        }
        fs.unlink(audioFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temporary audio file:', unlinkErr);
        });
      });
    });

  } catch (err) {
    console.error('Error in textToSpeech controller:', err);
    res.status(500).json({ msg: 'Server error during text-to-speech process.' });
  }
};

// Archive a note
exports.archiveNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, isArchived: false },
      { $set: { isArchived: true } },
      { new: true } // Return the updated document
    );

    if (!note) {
      return res.status(404).json({ msg: 'Note not found or already archived' });
    }
    res.json(note);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Restore an archived note
exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id, isArchived: true },
      { $set: { isArchived: false } },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({ msg: 'Note not found or not archived' });
    }
    res.json(note);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Permanently delete an archived note
exports.deleteArchivedNotePermanently = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id, isArchived: true });

    if (!note) {
      return res.status(404).json({ msg: 'Archived note not found' });
    }
    // TODO: Consider deleting associated media files from 'uploads' directory if it's an archived note with media
    res.json({ msg: 'Note permanently deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};