const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3011;
const SPRITESHEETS_DIR = path.join(__dirname, '..', 'public', 'spritesheets');
const DATA_DIR = path.join(__dirname, 'data');

app.use(express.json());

// ── Multer setup for spritesheet uploads ──

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Ensure upload directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure spritesheets directory exists
if (!fs.existsSync(SPRITESHEETS_DIR)) {
  fs.mkdirSync(SPRITESHEETS_DIR, { recursive: true });
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const SPRITE_SIZE = 32;
const COLS = 32;
const ROWS = 32;

/**
 * Load or create sprite data for a given spritesheet.
 * Data file lives at /server/data/{spritesheet_name}.json
 */
function loadSpriteData(sheetName) {
  const jsonPath = path.join(DATA_DIR, sheetName.replace(/\.png$/, '') + '.json');

  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(raw);
  }

  // Create default data: all 1024 sprites with empty title/description
  const sprites = [];
  let id = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      sprites.push({
        id: id++,
        row,
        col,
        x: col * SPRITE_SIZE,
        y: row * SPRITE_SIZE,
        title: '',
        description: '',
      });
    }
  }

  const data = {
    spritesheet: sheetName,
    spriteSize: SPRITE_SIZE,
    columns: COLS,
    rows: ROWS,
    sprites,
    groups: [],
  };

  // Write the default data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

/**
 * Load sprite data, ensuring groups field exists on existing files.
 */
function loadSpriteDataWithGroups(sheetName) {
  const data = loadSpriteData(sheetName);
  if (!data.groups) data.groups = [];
  return data;
}

/**
 * Save the full sprite data back to the JSON file.
 */
function saveSpriteData(sheetName, data) {
  const jsonPath = path.join(DATA_DIR, sheetName.replace(/\.png$/, '') + '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET /api/sprite-data/:sheetName - Load all sprite data for a spritesheet
app.get('/api/sprite-data/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const imgPath = path.join(SPRITESHEETS_DIR, sheetName);

    if (!fs.existsSync(imgPath)) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const data = loadSpriteDataWithGroups(sheetName);
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
    const updatedSprite = req.body;

    if (!updatedSprite || updatedSprite.row === undefined || updatedSprite.col === undefined) {
      return res.status(400).json({ error: 'Invalid sprite data: row and col required' });
    }

    const data = loadSpriteData(sheetName);
    const idx = data.sprites.findIndex(
      s => s.row === updatedSprite.row && s.col === updatedSprite.col
    );

    if (idx >= 0) {
      data.sprites[idx] = { ...data.sprites[idx], ...updatedSprite };
    } else {
      data.sprites.push(updatedSprite);
    }

    saveSpriteData(sheetName, data);
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
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
      return res.status(400).json({ error: 'groups must be an array' });
    }
    const data = loadSpriteDataWithGroups(sheetName);
    data.groups = groups;
    saveSpriteData(sheetName, data);
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
    const data = loadSpriteDataWithGroups(sheetName);
    data.groups = data.groups.filter(g => g.id !== groupId);
    saveSpriteData(sheetName, data);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ── Spritesheets listing ──

const LABEL_OVERRIDES = {
  'base_out_atlas.png': 'Base Out Atlas',
  'terrain_atlas.png': 'Terrain Atlas',
};

function listSpritesheets() {
  if (!fs.existsSync(SPRITESHEETS_DIR)) return [];
  const files = fs.readdirSync(SPRITESHEETS_DIR);
  return files
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(name => ({
      name,
      label: LABEL_OVERRIDES[name] || name.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    }));
}

// GET /api/spritesheets - List available spritesheets
app.get('/api/spritesheets', (_req, res) => {
  try {
    res.json(listSpritesheets());
  } catch (err) {
    console.error('Error listing spritesheets:', err);
    res.status(500).json({ error: 'Failed to list spritesheets' });
  }
});

// POST /api/upload - Upload spritesheet PNG + optional JSON
app.post('/api/upload', upload.fields([
  { name: 'png', maxCount: 1 },
  { name: 'json', maxCount: 1 },
]), (req, res) => {
  try {
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
    const pngDest = path.join(SPRITESHEETS_DIR, `${baseName}.png`);

    // Move PNG to spritesheets directory
    fs.copyFileSync(pngFile.path, pngDest);
    fs.unlinkSync(pngFile.path);

    // Handle JSON data file
    const jsonDest = path.join(DATA_DIR, `${baseName}.json`);

    if (jsonFile) {
      // Validate JSON extension
      if (!jsonFile.originalname.toLowerCase().endsWith('.json')) {
        return res.status(400).json({ error: 'JSON file must have a .json extension' });
      }
      // Move to data directory (overwrites if exists)
      fs.copyFileSync(jsonFile.path, jsonDest);
      fs.unlinkSync(jsonFile.path);
    } else {
      // Generate default data
      const sprites = [];
      let id = 0;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          sprites.push({
            id: id++,
            row, col,
            x: col * SPRITE_SIZE,
            y: row * SPRITE_SIZE,
            title: '', description: '',
          });
        }
      }
      const data = {
        spritesheet: `${baseName}.png`,
        spriteSize: SPRITE_SIZE,
        columns: COLS,
        rows: ROWS,
        sprites,
        groups: [],
      };
      fs.writeFileSync(jsonDest, JSON.stringify(data, null, 2), 'utf-8');
    }

    res.json({ success: true, name: `${baseName}.png`, label: listSpritesheets().find(s => s.name === `${baseName}.png`)?.label || baseName });
  } catch (err) {
    console.error('Error uploading spritesheet:', err);
    // Clean up uploads on error
    if (req.files) {
      Object.values(req.files).flat().forEach(f => {
        try { fs.unlinkSync(f.path); } catch {}
      });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ── Settings ──

const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

function loadSettings() {
  if (fs.existsSync(SETTINGS_PATH)) {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  }
  const defaults = { terrainCategories: [], collectionNames: [] };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2), 'utf-8');
  return defaults;
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

app.get('/api/settings', (req, res) => {
  try {
    res.json(loadSettings());
  } catch (err) {
    console.error('Error loading settings:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings object' });
    }
    saveSettings(settings);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ── Download endpoints ──

// Download spritesheet PNG
app.get('/api/download/png/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const imgPath = path.join(SPRITESHEETS_DIR, sheetName);

    if (!fs.existsSync(imgPath)) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const safeName = sheetName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.download(imgPath, safeName);
  } catch (err) {
    console.error('Error downloading spritesheet:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Download sprite data JSON
app.get('/api/download/json/:sheetName', (req, res) => {
  try {
    const { sheetName } = req.params;
    const imgPath = path.join(SPRITESHEETS_DIR, sheetName);

    if (!fs.existsSync(imgPath)) {
      return res.status(404).json({ error: 'Spritesheet not found' });
    }

    const data = loadSpriteDataWithGroups(sheetName);
    const jsonName = sheetName.replace(/\.png$/i, '') + '.json';
    res.setHeader('Content-Disposition', `attachment; filename="${jsonName}"`);
    res.json(data);
  } catch (err) {
    console.error('Error downloading sprite data:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Serve static spritesheets
app.use('/spritesheets', express.static(SPRITESHEETS_DIR));

app.listen(PORT, () => {
  console.log(`Sprite data server running on http://localhost:${PORT}`);
});
