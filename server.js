const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Klasör kontrolü
function ensureFoldersExist() {
  ['img', 'uploads'].forEach(folder => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/img', express.static('img'));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Multer yapılandırması: dosya türü ve boyutu doğrulama
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPEG, PNG, GIF veya WEBP dosyalarına izin verilir'));
    }
  }
});

// API: Resim yükleme
app.post('/api/upload', (req, res) => {
  upload.array('images')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: 'Dosya çok büyük. En fazla 5MB olmalı.' });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const uploadedFiles = [];
    req.files.forEach(file => {
      const targetPath = path.join('img', file.filename);
      fs.renameSync(file.path, targetPath);
      uploadedFiles.push(file.filename);
    });

    res.json({ success: true, files: uploadedFiles });
  });
});

// API: Resimleri listele
app.get('/api/images', (req, res) => {
  fs.readdir('img', (err, files) => {
    if (err) return res.status(500).json([]);
    res.json(files.map(file => ({ filename: file, url: `/img/${file}` })));
  });
});

// API: Resim sil
app.delete('/api/images/:filename', (req, res) => {
  const filePath = path.join('img', req.params.filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
    }

    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Silme işlemi başarısız' });
      }
      res.json({ success: true });
    });
  });
});

// Sunucu başlat
app.listen(PORT, () => {
  ensureFoldersExist();
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
