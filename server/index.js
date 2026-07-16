const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const archiver = require('archiver');
const db = require('./db');

const app = express();
const PORT = 3011;

// ── Trust proxy so req.ip reads the real client IP from X-Forwarded-For ──
app.set('trust proxy', true);

app.use(express.json());

// ── IP extraction middleware ──
app.use((req, _res, next) => {
  req.clientIp = db.normaliseIp(req.ip || req.socket.remoteAddress || 'unknown');
  next();
});

// ── Upload limits ──
const MAX_FILE_SIZE = 2 * 1024 * 1024;      // 2 MB per file
const MAX_SHEETS_PER_IP = 10;                // 10 sheets per IP
const MAX_STORAGE_PER_IP = 10 * 1024 * 1024; // 10 MB total per IP

// ── Multer setup for spritesheet uploads ──

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Ensure upload directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Migrate existing filesystem data to SQLite on startup ──
const migrated = db.migrateExistingData('127.0.0.1');
if (migrated > 0) {
  console.log(`Migrated ${migrated} items from filesystem to database`);
}

// ── Sprite data endpoints ──

// GET /api/sprite-data/:sheetName - Load all sprite data for a spritesheet
app.get('/api/sprite-data/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;

    // Verify the IP has this sheet uploaded
    const png = db.getUploadedPng(ip, sheetName);
    if (!png) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const data = db.loadSpriteDataSafe(ip, sheetName);
    res.json(data);
  } catch (err) {
    console.error('Error loading sprite data:', err);
    res.status(500).json({ error: 'Failed to load sprite data' });
  }
});

// PUT /api/sprite-data/:sheetName - Update a single sprite's metadata (auto-save)
app.put('/api/sprite-data/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;
    const updatedSprite = req.body;

    if (!updatedSprite || updatedSprite.row === undefined || updatedSprite.col === undefined) {
      return res.status(400).json({ error: 'Invalid sprite data: row and col required' });
    }

    const data = db.loadSpriteData(ip, sheetName);
    const idx = data.sprites.findIndex(
      s => s.row === updatedSprite.row && s.col === updatedSprite.col
    );

    if (idx >= 0) {
      data.sprites[idx] = { ...data.sprites[idx], ...updatedSprite };
    } else {
      data.sprites.push(updatedSprite);
    }

    db.saveSpriteData(ip, sheetName, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving sprite data:', err);
    res.status(500).json({ error: 'Failed to save sprite data' });
  }
});

// PUT /api/groups/:sheetName - Replace the full groups array (auto-save)
app.put('/api/groups/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;
    const { groups } = req.body;

    if (!Array.isArray(groups)) {
      return res.status(400).json({ error: 'groups must be an array' });
    }

    const data = db.loadSpriteDataSafe(ip, sheetName);
    data.groups = groups;
    db.saveSpriteData(ip, sheetName, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving groups:', err);
    res.status(500).json({ error: 'Failed to save groups' });
  }
});

// DELETE /api/groups/:sheetName/:groupId - Remove a group by ID
app.delete('/api/groups/:sheetName/:groupId', (req, res) => {
  try {
    const { sheetName, groupId } = req.params;
    const ip = req.clientIp;

    const data = db.loadSpriteDataSafe(ip, sheetName);
    data.groups = data.groups.filter(g => g.id !== groupId);
    db.saveSpriteData(ip, sheetName, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ── Spritesheets listing ──

// DELETE /api/spritesheets/:sheetName - Delete a spritesheet and its data
app.delete('/api/spritesheets/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;

    const png = db.getUploadedPng(ip, sheetName);
    if (!png) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    db.deleteSheet(ip, sheetName);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting spritesheet:', err);
    res.status(500).json({ error: 'Failed to delete spritesheet' });
  }
});

// GET /api/spritesheets - List spritesheets visible to this IP
app.get('/api/spritesheets', (req, res) => {
  try {
    const ip = req.clientIp;
    res.json(db.listSpritesheets(ip));
  } catch (err) {
    console.error('Error listing spritesheets:', err);
    res.status(500).json({ error: 'Failed to list spritesheets' });
  }
});

// ── Upload ──

// POST /api/upload - Upload spritesheet PNG + optional JSON (stored per-IP)
app.post('/api/upload', (req, res, next) => {
  upload.fields([
    { name: 'png', maxCount: 1 },
    { name: 'json', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds the 2 MB size limit.' });
      }
      console.error('Multer error:', err);
      return res.status(400).json({ error: 'Upload failed: ' + err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    const ip = req.clientIp;
    const pngFile = req.files?.png?.[0];
    const jsonFile = req.files?.json?.[0];

    if (!pngFile) {
      return res.status(400).json({ error: 'A PNG spritesheet file is required' });
    }

    // Validate PNG extension
    if (!pngFile.originalname.toLowerCase().endsWith('.png')) {
      fs.unlinkSync(pngFile.path);
      return res.status(400).json({ error: 'PNG file must have a .png extension' });
    }

    const baseName = pngFile.originalname.replace(/\.png$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sheetName = `${baseName}.png`;

    // Check per-IP limits before storing
    const sheetCount = db.getUploadCount(ip);
    if (sheetCount >= MAX_SHEETS_PER_IP) {
      fs.unlinkSync(pngFile.path);
      if (jsonFile) fs.unlinkSync(jsonFile.path);
      return res.status(429).json({ error: `Limit of ${MAX_SHEETS_PER_IP} spritesheets per IP reached. Delete a sheet before uploading a new one.` });
    }

    const currentStorage = db.getTotalStorageBytes(ip);
    const pngSize = pngFile.size;
    if (currentStorage + pngSize > MAX_STORAGE_PER_IP) {
      fs.unlinkSync(pngFile.path);
      if (jsonFile) fs.unlinkSync(jsonFile.path);
      const remainingMb = ((MAX_STORAGE_PER_IP - currentStorage) / (1024 * 1024)).toFixed(1);
      return res.status(429).json({ error: `Storage limit of 10 MB reached. Only ${remainingMb} MB remaining for this IP.` });
    }

    // Read PNG into buffer and store in SQLite
    const pngBuffer = fs.readFileSync(pngFile.path);
    db.storeUploadedPng(ip, sheetName, pngBuffer, pngFile.originalname);
    fs.unlinkSync(pngFile.path);

    // Handle JSON data file
    if (jsonFile) {
      if (!jsonFile.originalname.toLowerCase().endsWith('.json')) {
        return res.status(400).json({ error: 'JSON file must have a .json extension' });
      }
      const jsonContent = fs.readFileSync(jsonFile.path, 'utf-8');
      try {
        const data = JSON.parse(jsonContent);
        if (!data.sprites) data.sprites = [];
        if (!data.groups) data.groups = [];
        if (!data.terrainCategories) data.terrainCategories = [];
        if (!data.collectionNames) data.collectionNames = [];
        data.spritesheet = sheetName;
        db.saveSpriteData(ip, sheetName, data);
      } catch (e) {
        // Invalid JSON — generate defaults below
        console.warn('Uploaded JSON was invalid, generating defaults:', e.message);
        // Fall through to default generation
      }
      fs.unlinkSync(jsonFile.path);
    }

    // If no JSON was provided (or it was invalid), ensure default sprite data exists
    const existing = db.loadSpriteDataSafe(ip, sheetName);

    const sheets = db.listSpritesheets(ip);
    const label = sheets.find(s => s.name === sheetName)?.label || baseName;
    res.json({ success: true, name: sheetName, label });
  } catch (err) {
    console.error('Error uploading spritesheet:', err);
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        try { fs.unlinkSync(f.path); } catch {}
      });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Sprite image serving ──

// GET /api/spritesheet-img/:sheetName - Serve a spritesheet PNG (per-IP only)
app.get('/api/spritesheet-img/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;

    const png = db.getUploadedPng(ip, sheetName);
    if (png) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(png);
    }

    res.status(404).json({ error: 'Spritesheet not found' });
  } catch (err) {
    console.error('Error serving spritesheet image:', err);
    res.status(500).json({ error: 'Failed to serve spritesheet image' });
  }
});

// ── Per-sheet settings ──

// PUT /api/sprite-settings/:sheetName - Save terrain categories and collection names
app.put('/api/sprite-settings/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;
    const { terrainCategories, collectionNames } = req.body;

    if (!Array.isArray(terrainCategories) || !Array.isArray(collectionNames)) {
      return res.status(400).json({ error: 'terrainCategories and collectionNames must be arrays' });
    }

    const data = db.loadSpriteDataSafe(ip, sheetName);
    data.terrainCategories = terrainCategories;
    data.collectionNames = collectionNames;
    db.saveSpriteData(ip, sheetName, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving sprite settings:', err);
    res.status(500).json({ error: 'Failed to save sprite settings' });
  }
});

// ── Download endpoints ──

// Download spritesheet PNG (per-IP)
app.get('/api/download/png/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;

    const png = db.getUploadedPng(ip, sheetName);
    if (!png) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const safeName = sheetName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.send(png);
  } catch (err) {
    console.error('Error downloading spritesheet:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Download sprite data JSON (per-IP)
app.get('/api/download/json/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const ip = req.clientIp;

    const png = db.getUploadedPng(ip, sheetName);
    if (!png) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const data = db.loadSpriteDataSafe(ip, sheetName);
    const jsonName = sheetName.replace(/\.png$/i, '') + '.json';
    res.setHeader('Content-Disposition', `attachment; filename="${jsonName}"`);
    res.json(data);
  } catch (err) {
    console.error('Error downloading sprite data:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// GET /api/download/all - Download all IP's spritesheets + JSON as a zip
app.get('/api/download/all', (req, res) => {
  const ip = req.clientIp;
  const sheets = db.listSpritesheets(ip);

  if (sheets.length === 0) {
    return res.status(404).json({ error: 'No spritesheets available' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="spritesheets.zip"');

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    res.status(500).json({ error: 'Failed to create archive' });
  });

  archive.pipe(res);

  for (const sheet of sheets) {
    const png = db.getUploadedPng(ip, sheet.name);
    if (png) {
      archive.append(png, { name: sheet.name });
    }

    const jsonName = sheet.name.replace(/\.png$/i, '') + '.json';
    try {
      const data = db.loadSpriteDataSafe(ip, sheet.name);
      archive.append(JSON.stringify(data, null, 2), { name: jsonName });
    } catch {
      // Skip if data can't be loaded
    }
  }

  archive.finalize();
});

// ── Legacy spritesheet image serving (for backward compat / static reference) ──
app.use('/spritesheets', express.static(path.join(__dirname, '..', 'public', 'spritesheets'), {
  maxAge: '1y',
  immutable: true,
}));

app.listen(PORT, () => {
  console.log(`Sprite data server running on http://localhost:${PORT}`);
});
