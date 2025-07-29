// quicknotes-api/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define storage for files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads'); // Path to your uploads folder
    // Create the uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent conflicts
    // e.g., 'image-1234567890.jpg' or 'video-abcdef.mp4'
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter for file types
const fileFilter = (req, file, cb) => {
  // Accept only image, video, and PDF files
  if (file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    // Reject other file types
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 50 // Limit files to 50MB (adjust as needed)
  }
});

module.exports = upload;