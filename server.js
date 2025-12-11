// server.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9000; // API: http://192.168.1.199:3000

// ===== CORS (allow your frontend app) =====
app.use(cors({
  origin: '*', // or set your frontend URL here
}));

// Root upload path
const ROOT_UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure root folder exists
if (!fs.existsSync(ROOT_UPLOAD_DIR)) {
  fs.mkdirSync(ROOT_UPLOAD_DIR, { recursive: true });
}

// ===== Multer storage (dynamic folder by folderName) =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderName = req.body.folderName || 'default';
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const uploadPath = path.join(ROOT_UPLOAD_DIR, safeFolderName);

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      cb(err, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // keep original file name
  }
});

// Allow many files per request
const upload = multer({
  storage: storage,
  // Optional limit example:
  // limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB
});

// ===== Routes =====

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Upload multiple files
// field name must match frontend: "files"
app.post('/upload', upload.array('files', 100), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  const folderName = req.body.folderName || 'default';

  res.json({
    success: true,
    message: 'Files uploaded successfully',
    folder: folderName,
    count: req.files.length,
    files: req.files.map((f) => ({
      originalName: f.originalname,
      savedAs: f.filename,
      path: f.path
    }))
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`File upload API running at http://192.168.1.199:${PORT}`);
});
