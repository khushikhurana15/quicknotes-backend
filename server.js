// server.js (Adjusted for recommended structure)

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();

// --- CORS Configuration ---
// Define allowed origins for production
const allowedOrigins = [
  'http://localhost:3000', 
  'https://quicknotes-frontend-orcin.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or if the origin is in our allowed list.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS Error: Origin ${origin} not allowed`); // Log the blocked origin
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Ensure all HTTP methods your API uses are listed
  credentials: true // Important for sending cookies/authorization headers (e.g., JWT in headers)
}));

// --- Middleware ---
app.use(express.json()); // Add this if you haven't already for parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- Database Connection ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
connectDB();

// --- Import Routes ---
const authMiddleware = require('./middleware/auth'); // Your auth.js middleware
const noteRoutes = require('./routes/noteRoutes'); // Authenticated note routes
const publicRoutes = require('./routes/publicRoutes'); // Public note routes
const authUserRoutes = require('./routes/authRoutes'); // Assuming this handles /api/auth/register, /api/auth/login etc.

// --- Mount Routes ---

// 1. Public Routes (NO AUTH)
app.use('/api/public-notes', publicRoutes); // Example: GET /api/public-notes/:shareId

// 2. User Authentication Routes (NO AUTH)
app.use('/api/auth', authUserRoutes); // Example: POST /api/auth/register, POST /api/auth/login

// 3. Protected API Routes (WITH AUTH)
// Apply the auth middleware only to routes that require authentication
app.use('/api/notes', authMiddleware, noteRoutes); // Example: GET /api/notes, POST /api/notes, PUT /api/notes/:id

// Basic root route
app.get('/', (req, res) => {
  res.send('📘 Welcome to QuickNotes API - Server is Running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;