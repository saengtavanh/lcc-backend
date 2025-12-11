const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9001;

// allow frontend to call this API
app.use(cors({ origin: '*' }));

// Root upload directory (level 0)
const ROOT_UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(ROOT_UPLOAD_DIR)) {
  fs.mkdirSync(ROOT_UPLOAD_DIR, { recursive: true });
}

// helper: sanitize folder name
function sanitizeName(name, fallback) {
  const raw = (name || '').toString().trim();
  const used = raw || fallback;
  const safe = used.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return { raw: used, safe };
}

// ========= Multer storage =========
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const company = sanitizeName(req.body.companyName, 'company_default'); // lv1
    const project = sanitizeName(req.body.projectName, 'project_default'); // lv2
    const title = sanitizeName(req.body.titleName, 'title_default');       // lv3

    const uploadPath = path.join(
      ROOT_UPLOAD_DIR,
      company.safe,
      project.safe,
      title.safe
    );

    // store info for later use in route
    if (!req._uploadInfo) {
      req._uploadInfo = {
        company,
        project,
        title,
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
  // limits: { fileSize: 5 * 1024 * 1024 * 1024 } // example 5GB
});

// serve uploads as static files (optional but useful)
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

  const info = req._uploadInfo;
  const company = info?.company || sanitizeName(req.body.companyName, 'company_default');
  const project = info?.project || sanitizeName(req.body.projectName, 'project_default');
  const title = info?.title || sanitizeName(req.body.titleName, 'title_default');
  const uploadPath =
    info?.uploadPath ||
    path.join(ROOT_UPLOAD_DIR, company.safe, project.safe, title.safe);

  // full path on server
  const folderPath = uploadPath;

  // URL prefix (HTTP access)
  const folderUrl = `/uploads/${company.safe}/${project.safe}/${title.safe}`;

  res.json({
    success: true,
    message: 'Files uploaded successfully',
    company: {
      raw: company.raw,
      safe: company.safe,
    },
    project: {
      raw: project.raw,
      safe: project.safe,
    },
    title: {
      raw: title.raw,
      safe: title.safe,
    },
    folderPath,      // e.g. /app/uploads/system/project1/lcc-001
    folderUrl,       // e.g. /uploads/system/project1/lcc-001
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
