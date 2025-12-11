const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// 👇 backend port (inside Docker or bare metal)
const PORT = 9001;

// allow frontend to call this API
app.use(cors({ origin: '*' }));

// Root upload directory
const ROOT_UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(ROOT_UPLOAD_DIR)) {
  fs.mkdirSync(ROOT_UPLOAD_DIR, { recursive: true });
}

// ========= Multer storage =========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rawFolderName = req.body.folderName || 'default';
    const safeFolderName = rawFolderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const uploadPath = path.join(ROOT_UPLOAD_DIR, safeFolderName);

    // Store folder info on the request so we can use it in the route
    if (!req._uploadInfo) {
      req._uploadInfo = {
        rawFolderName,
        safeFolderName,
        uploadPath,
      };
    }

    fs.mkdir(uploadPath, { recursive: true }, (err) => {
      cb(err, uploadPath);
    });
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  // limits: { fileSize: 5 * 1024 * 1024 * 1024 } // example: 5GB
});

// serve uploads as static files (optional, but useful)
app.use('/uploads', express.static(ROOT_UPLOAD_DIR));

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========= Upload route =========
app.post('/upload', upload.array('files', 100), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
    });
  }

  const info = req._uploadInfo || {};
  const rawFolderName = info.rawFolderName || (req.body.folderName || 'default');
  const safeFolderName = info.safeFolderName || rawFolderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const uploadPath = info.uploadPath || path.join(ROOT_UPLOAD_DIR, safeFolderName);

  // this is the folder path ON THE SERVER
  const absoluteFolderPath = uploadPath; // e.g. /app/uploads/scan_2025_10_27

  // optional: URL to access via HTTP (because we did app.use('/uploads', ...))
  const folderUrl = `/uploads/${safeFolderName}`;

  res.json({
    success: true,
    message: 'Files uploaded successfully',
    folderName: rawFolderName,
    folderNameSafe: safeFolderName,
    folderPath: absoluteFolderPath,   // 👈 full path on backend
    folderUrl: folderUrl,            // 👈 relative URL (http://192.168.1.199:9001 + this)
    count: req.files.length,
    files: req.files.map((f) => ({
      originalName: f.originalname,
      savedAs: f.filename,
      path: f.path,
    })),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`File upload API running at http://192.168.1.199:${PORT}`);
});
