// controllers/noteController.js

const Note = require('../models/Note');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs'); // Keep fs for temp_audio, but remove for uploads
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('../config/cloudinaryConfig'); // IMPORT CLOUDINARY HERE!

// Helper function to determine Cloudinary resource type
const getCloudinaryResourceType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'raw'; // PDFs are 'raw' in Cloudinary
  return 'auto'; // Default or handle unsupported types
};

// Get all notes for the authenticated user (now handles archived status)
exports.getAllNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { showArchived } = req.query;

    let query = { user: userId, isArchived: false };

    if (showArchived === 'true') {
      query = { user: userId, isArchived: true };
    } else if (showArchived === 'all') {
      query = { user: userId };
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
    const { title, content, isPinned, tags } = req.body; // Remove mediaPath, mediaType from destructuring
    let mediaUrl = null; // Will store the Cloudinary URL
    let mediaType = null; // Will store the determined media type (image, video, application)

    // --- NEW CLOUDINARY UPLOAD LOGIC FOR CREATE ---
    if (req.file) { // Check if a file was uploaded by multer
      // Optional: Add file type validation if you want stricter control
      // if (!['image/', 'video/', 'application/pdf'].some(type => req.file.mimetype.startsWith(type))) {
      //   return res.status(400).json({ msg: 'Unsupported file type.' });
      // }

      try {
        const resourceType = getCloudinaryResourceType(req.file.mimetype);
        const uploadOptions = {
          folder: 'quicknotes_media', // Folder in your Cloudinary account
          resource_type: resourceType,
          format: resourceType === 'raw' ? 'pdf' : undefined, // Explicitly set format for PDFs
          // If you want to transform images or videos upon upload, add options here
        };

        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, uploadOptions);
        mediaUrl = result.secure_url; // Cloudinary's secure URL
        mediaType = resourceType === 'raw' ? 'application' : resourceType; // Map 'raw' back to 'application' for frontend
      } catch (uploadError) {
        console.error('Cloudinary Upload Error during note creation:', uploadError);
        return res.status(500).json({ message: 'Failed to upload media to cloud storage.' });
      }
    }
    // --- END NEW CLOUDINARY UPLOAD LOGIC ---

    const newNote = new Note({
      title,
      content,
      user: req.user.id,
      mediaPath: mediaUrl, // Save the Cloudinary URL
      mediaType: mediaType, // Save the determined type
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
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};

// --- NEW: Controller Functions for Public Sharing Management ---

// @desc    Get share info for a specific note (for the creator)
// @route   GET /api/notes/:noteId/share-info
// @access  Private (only creator can see this info)
exports.getNoteShareInfo = async (req, res) => {
    try {
        const { noteId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }

        const note = await Note.findOne({ _id: noteId, user: req.user.id });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or you are not authorized.' });
        }

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

        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            return res.status(400).json({ message: 'Invalid note ID format.' });
        }

        const note = await Note.findOne({ _id: noteId, user: req.user.id });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or you are not authorized.' });
        }

        if (req.method === 'POST') {
            if (!note.shareId) {
                let newShareId;
                let isUnique = false;
                while (!isUnique) {
                    newShareId = uuidv4();
                    const existingNoteWithShareId = await Note.findOne({ shareId: newShareId });
                    if (!existingNoteWithShareId) {
                        isUnique = true;
                    }
                }
                note.shareId = newShareId;
            }
            note.isPublic = true;
            await note.save();
            res.status(200).json({ message: 'Note made public', shareId: note.shareId });

        } else if (req.method === 'DELETE') {
            note.isPublic = false;
            note.shareId = undefined;
            await note.save();
            res.status(200).json({ message: 'Note sharing disabled' });
        } else {
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

        const note = await Note.findOne({ shareId: shareId, isPublic: true });

        if (!note) {
            return res.status(404).json({ message: 'Note not found or not public.' });
        }

        const publicNote = {
            _id: note._id,
            title: note.title,
            content: note.content,
            // --- MODIFICATION FOR PUBLIC NOTES: Return Cloudinary URL directly ---
            mediaPath: note.mediaPath, // Now it's already the full Cloudinary URL
            mediaType: note.mediaType,
            tags: note.tags,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
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
    const { title, content, isPinned, removeMedia } = req.body; // Add removeMedia to destructuring

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
    // (No change here, this logic is already robust)
    let updatedTags = [];
    if (req.body.tags !== undefined) {
        let incomingTags = req.body.tags;
        while (typeof incomingTags === 'string' && incomingTags.startsWith('[') && incomingTags.endsWith(']')) {
            try {
                incomingTags = JSON.parse(incomingTags);
            } catch (e) {
                console.error("Backend Update: Failed to parse incoming tags string during unwrapping:", req.body.tags, e);
                incomingTags = [];
                break;
            }
        }
        if (Array.isArray(incomingTags)) {
            updatedTags = incomingTags.map(tag => typeof tag === 'string' ? tag.trim() : String(tag)).filter(tag => tag !== '');
        } else if (typeof incomingTags === 'string' && incomingTags.trim() !== '') {
            updatedTags = incomingTags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
        } else {
            updatedTags = [];
        }
    } else {
        let existingTags = note.tags;
        while (typeof existingTags === 'string' && existingTags.startsWith('[') && existingTags.endsWith(']')) {
            try {
                existingTags = JSON.parse(existingTags);
            } catch (e) {
                console.error("Backend Update: Failed to parse existing tags string during unwrapping:", note.tags, e);
                existingTags = [];
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
    note.tags = updatedTags;
    // --- END CRITICAL FIX FOR TAGS ---


    // --- NEW CLOUDINARY UPLOAD/REMOVAL LOGIC FOR UPDATE ---
    if (removeMedia === 'true') { // Frontend explicitly asked to remove media
      if (note.mediaPath) { // Only delete from Cloudinary if there's an existing file
        try {
          // Extract public_id from the Cloudinary URL
          // Example URL: https://res.cloudinary.com/your_cloud_name/image/upload/v123456789/folder/public_id.jpg
          // We need 'folder/public_id' or just 'public_id'
          const parts = note.mediaPath.split('/');
          const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/').split('.')[0]; // Adjust this based on your Cloudinary folder structure
          
          await cloudinary.uploader.destroy(folderAndPublicId, { resource_type: getCloudinaryResourceType(note.mediaType) || 'auto' });
          console.log(`Successfully deleted media from Cloudinary: ${folderAndPublicId}`);
        } catch (deleteError) {
          console.error('Cloudinary Delete Error:', deleteError);
          // Don't necessarily block the update if deletion fails (e.g., file already gone)
        }
      }
      note.mediaPath = undefined;
      note.mediaType = undefined;
    }

    if (req.file) { // If a new file is uploaded
      // If there was an old media file and it wasn't marked for removal, delete it first
      // OR, if removeMedia was true but a new file was also uploaded, the new file replaces it.
      // This means we potentially delete the old one first.
      if (note.mediaPath && removeMedia !== 'true') { // If old media existed and not already marked for removal
         try {
            const parts = note.mediaPath.split('/');
            const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(folderAndPublicId, { resource_type: getCloudinaryResourceType(note.mediaType) || 'auto' });
            console.log(`Successfully deleted old media from Cloudinary: ${folderAndPublicId}`);
         } catch (deleteError) {
            console.error('Cloudinary Delete Error for old file:', deleteError);
         }
      }

      try {
        const resourceType = getCloudinaryResourceType(req.file.mimetype);
        const uploadOptions = {
          folder: 'quicknotes_media',
          resource_type: resourceType,
          format: resourceType === 'raw' ? 'pdf' : undefined,
        };

        const result = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, uploadOptions);
        note.mediaPath = result.secure_url; // Save new Cloudinary URL
        note.mediaType = resourceType === 'raw' ? 'application' : resourceType;
      } catch (uploadError) {
        console.error('Cloudinary Upload Error during note update:', uploadError);
        return res.status(500).json({ message: 'Failed to upload new media to cloud storage.' });
      }
    }
    // --- END NEW CLOUDINARY UPLOAD/REMOVAL LOGIC ---


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

    // --- NEW: Delete associated media files from Cloudinary ---
    if (deletedNote.mediaPath) {
      try {
        const parts = deletedNote.mediaPath.split('/');
        const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(folderAndPublicId, { resource_type: getCloudinaryResourceType(deletedNote.mediaType) || 'auto' });
        console.log(`Successfully deleted media from Cloudinary during note deletion: ${folderAndPublicId}`);
      } catch (deleteError) {
        console.error('Cloudinary Delete Error during note deletion:', deleteError);
        // Don't necessarily block the deletion of the note if media deletion fails
      }
    }
    // --- END NEW: Delete associated media files from Cloudinary ---

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
    const pythonProcess = spawn('python3', [ // Ensure 'python3' is available on Render, or 'python'
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
      { new: true }
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
    // --- NEW: Delete associated media files from Cloudinary for permanently deleted archived notes ---
    if (note.mediaPath) {
      try {
        const parts = note.mediaPath.split('/');
        const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(folderAndPublicId, { resource_type: getCloudinaryResourceType(note.mediaType) || 'auto' });
        console.log(`Successfully deleted media from Cloudinary during permanent deletion: ${folderAndPublicId}`);
      } catch (deleteError) {
        console.error('Cloudinary Delete Error during permanent deletion:', deleteError);
      }
    }
    // --- END NEW: Delete associated media files from Cloudinary ---
    res.json({ msg: 'Note permanently deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};