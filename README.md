QuickNotes
Project Description
QuickNotes is a comprehensive and intuitive note-taking application designed to help users efficiently organize their thoughts, tasks, and important information. It provides a rich text editor for detailed note creation, supports various media attachments (images, videos, PDFs) via Cloudinary integration, and offers robust features like tagging, pinning, archiving, and public sharing. The application aims to provide a seamless and secure experience for managing personal and shareable content.

Features
User Authentication: Secure user registration and login system.

Rich Text Editor: Create notes with rich formatting using a modern text editor.

Media Attachments: Attach images, videos, and PDF documents to notes.

Cloudinary Integration: All media files are securely stored on Cloudinary, ensuring scalability and reliable access.

In-App Media Viewer: View attached images, play videos, and preview PDFs directly within the application.

PDF Viewer with Controls: PDFs open in a dedicated modal with native browser controls for downloading, printing, and navigation.

Tagging System: Organize notes with customizable tags for easy categorization and filtering.

Note Pinning: Pin important notes to the top for quick access.

Archiving: Archive notes to keep your main workspace clutter-free, with options to restore or permanently delete.

Search Functionality: Efficiently search through note titles, content, and tags.

Text-to-Speech: Convert note content into spoken audio for hands-free consumption.

Public Sharing: Generate unique, shareable links for individual notes, allowing public access to specific content.

Responsive Design: Optimized for a consistent user experience across various devices (desktop, tablet, mobile).

Tech Stack
Frontend
React.js: A JavaScript library for building user interfaces.

React-PDF: For rendering and displaying PDF documents directly in the browser.

Axios: Promise-based HTTP client for making API requests.

React Toastify: For displaying toast notifications.

React Icons: For scalable vector icons.

Tailwind CSS (or similar CSS framework): For utility-first styling (assuming it's used for the general UI).

Backend
Node.js: JavaScript runtime for server-side logic.

Express.js: Fast, unopinionated, minimalist web framework for Node.js.

MongoDB: NoSQL database for storing note data and user information.

Mongoose: MongoDB object data modeling (ODM) for Node.js.

Cloudinary: Cloud-based image and video management service for media storage and delivery.

Multer: Node.js middleware for handling multipart/form-data, primarily used for file uploads.

gTTS (Google Text-to-Speech): Python library used for text-to-speech conversion.

child_process (Node.js): For spawning and interacting with the Python TTS script.

JSON Web Tokens (JWT): For secure user authentication.

Dotenv: For loading environment variables from a .env file.

Deployment
Frontend: Vercel (or similar hosting service)

Backend: Render (or similar hosting service)

Database: MongoDB Atlas

Setup Instructions
To get a copy of the project up and running on your local machine for development and testing purposes, follow these steps.

Prerequisites
Node.js (LTS version recommended)

npm (comes with Node.js)

Python 3.x

Git

1. Clone the Repositories
First, clone both the frontend and backend repositories to your local machine:

# Clone the backend repository
git clone <URL_TO_YOUR_BACKEND_REPO> quicknotes-api
cd quicknotes-api

# Clone the frontend repository
git clone <URL_TO_YOUR_FRONTEND_REPO> quicknotes-new-frontend
cd quicknotes-new-frontend

Replace <URL_TO_YOUR_BACKEND_REPO> and <URL_TO_YOUR_FRONTEND_REPO> with the actual Git URLs of your repositories.

2. Backend Setup
Navigate into the quicknotes-api directory:

cd ../quicknotes-api

Install Dependencies:

npm install
# Also install Python dependencies for TTS
pip install gtts

Environment Variables (.env file):

Create a .env file in the root of the quicknotes-api directory and add the following:

NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=a_very_secret_key_for_jwt_token_signing

# Cloudinary Credentials (from your Cloudinary Dashboard)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

Replace your_mongodb_atlas_connection_string with your actual MongoDB Atlas connection string.

Replace a_very_secret_key_for_jwt_token_signing with a strong, random string.

Replace Cloudinary credentials with your actual values from your Cloudinary dashboard.

Run the Backend Server:

npm start

The backend server should start on http://localhost:5000 (or your specified PORT).

3. Frontend Setup
Open a new terminal window and navigate into the quicknotes-new-frontend directory:

cd ../quicknotes-new-frontend

Install Dependencies:

npm install

Environment Variables (.env.local file):

Create a .env.local file in the root of the quicknotes-new-frontend directory and add the following:

REACT_APP_API_URL=http://localhost:5000

This tells your frontend where to find your locally running backend.

Run the Frontend Application:

npm start

This will open the application in your browser, usually at http://localhost:3000.

4. Database Setup
Ensure your MongoDB Atlas cluster is running and accessible.

The application will automatically create the necessary collections (users, notes) when data is first inserted.

5. Testing
Once both frontend and backend are running:

Register a new user.

Log in.

Create new notes, attach images, videos, and PDFs.

Test editing, pinning, archiving, deleting, sharing, and text-to-speech functionalities.
