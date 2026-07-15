const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3011;
const SPRITESHEETS_DIR = path.join(__dirname, '..', 'public', 'spritesheets');
const DATA_DIR = path.join(__dirname, 'data');

app.use(express.json());

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

// Serve static spritesheets
app.use('/spritesheets', express.static(SPRITESHEETS_DIR));

app.listen(PORT, () => {
  console.log(`Sprite data server running on http://localhost:${PORT}`);
});
