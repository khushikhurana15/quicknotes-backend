// migrate-isArchived.js (or whatever you named it)

const mongoose = require('mongoose');
// Adjust this path if your Note model is in a different location relative to this script
const Note = require('./models/Note');
// Or if you use a central database config:
// const connectDB = require('./config/db'); // assuming this exists and handles connection

// --- IMPORTANT: Replace with your actual MongoDB connection string ---
// If you use process.env.MONGO_URI, make sure your .env file is accessible
// or hardcode it temporarily for this script.
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quicknotes'; // <-- ADDED QUOTES HERE!
// --- END IMPORTANT ---

if (!MONGODB_URI || MONGODB_URI === 'YOUR_ACTUAL_MONGODB_CONNECTION_STRING_HERE') {
  console.error('ERROR: MONGODB_URI is not set or is a placeholder. Please update the script.');
  process.exit(1); // Exit if URI is not set
}

async function runMigration() {
  try {
    console.log('Attempting to connect to MongoDB for migration...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Remove useFindAndModify, useCreateIndex if you have them, they are deprecated
    });
    console.log('MongoDB connected successfully for migration.');

    console.log('Checking for notes without isArchived field...');
    const result = await Note.updateMany(
      { isArchived: { $exists: false } }, // Find notes where isArchived field does NOT exist
      { $set: { isArchived: false } }     // Set isArchived to false for them
    );

    console.log(`Migration complete: ${result.matchedCount} notes matched, ${result.modifiedCount} notes updated.`);

  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    if (mongoose.connection.readyState === 1) { // Check if connected (1 = connected)
      await mongoose.disconnect();
      console.log('MongoDB connection closed.');
    }
    process.exit(); // Exit the process
  }
}

runMigration();