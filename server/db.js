const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.db');
let db = null;

const ROWS = 32;
const COLS = 32;
const SPRITE_SIZE = 32;

const LABEL_OVERRIDES = {};

function initDb() {
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode=WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sprite_data (
      ip TEXT NOT NULL,
      sheet_name TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (ip, sheet_name)
    );

    CREATE TABLE IF NOT EXISTS uploaded_pngs (
      ip TEXT NOT NULL,
      sheet_name TEXT NOT NULL,
      png BLOB,
      original_name TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (ip, sheet_name)
    );
  `);

  return db;
}

function getDb() {
  if (!db) return initDb();
  return db;
}

/**
 * Sanitize an IP address for use as a key (no escaping needed for SQLite params,
 * but normalise IPv6 localhost representations).
 */
function normaliseIp(ip) {
  if (!ip) return 'unknown';
  // Strip IPv4-mapped IPv6 prefix
  if (ip === '::ffff:127.0.0.1' || ip === '::1') return '127.0.0.1';
  return ip;
}

/**
 * Migrate existing JSON files from server/data/ and PNGs from public/spritesheets/
 * into the database for the given IP. Safe to call multiple times — uses INSERT OR IGNORE.
 */
function migrateExistingData(targetIp) {
  const d = getDb();
  const dataDir = path.join(__dirname, 'data');
  const sheetsDir = path.join(__dirname, '..', 'public', 'spritesheets');
  let migrated = 0;

  // Migrate JSON metadata files
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    const insertData = d.prepare(
      'INSERT OR IGNORE INTO sprite_data (ip, sheet_name, data) VALUES (?, ?, ?)'
    );

    for (const file of files) {
      const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      try {
        JSON.parse(content); // validate
        insertData.run(targetIp, file, content);
        migrated++;
      } catch (e) {
        console.warn(`Skipping invalid JSON in ${file}: ${e.message}`);
      }
    }
  }

  // Migrate PNGs from public/spritesheets/ into uploaded_pngs
  if (fs.existsSync(sheetsDir)) {
    const pngFiles = fs.readdirSync(sheetsDir).filter(f => f.endsWith('.png'));
    const insertPng = d.prepare(
      'INSERT OR IGNORE INTO uploaded_pngs (ip, sheet_name, png, original_name) VALUES (?, ?, ?, ?)'
    );

    for (const file of pngFiles) {
      const buf = fs.readFileSync(path.join(sheetsDir, file));
      insertPng.run(targetIp, file, buf, file);
      migrated++;
    }
  }

  return migrated;
}

/**
 * Load sprite data for a given IP and sheet.
 * If no per-IP data exists, create default empty data and save it.
 */
function loadSpriteData(ip, sheetName) {
  const d = getDb();
  const row = d.prepare(
    'SELECT data FROM sprite_data WHERE ip = ? AND sheet_name = ?'
  ).get(ip, sheetName);

  if (row) {
    return ensureFields(JSON.parse(row.data));
  }

  // Create default data for a fresh sheet
  const sprites = [];
  let id = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      sprites.push({
        id: id++, row, col,
        x: col * SPRITE_SIZE, y: row * SPRITE_SIZE,
        title: '', description: '',
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
    terrainCategories: [],
    collectionNames: [],
  };
  saveSpriteData(ip, sheetName, data);
  return data;
}

function loadSpriteDataSafe(ip, sheetName) {
  return ensureFields(loadSpriteData(ip, sheetName));
}

function saveSpriteData(ip, sheetName, data) {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO sprite_data (ip, sheet_name, data, updated_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(ip, sheetName, JSON.stringify(data));
}

function ensureFields(data) {
  if (!data.groups) data.groups = [];
  if (!data.terrainCategories) data.terrainCategories = [];
  if (!data.collectionNames) data.collectionNames = [];
  return data;
}

/**
 * List spritesheets visible to a given IP — only sheets they've uploaded.
 */
function listSpritesheets(ip) {
  const d = getDb();
  const rows = d.prepare(
    'SELECT DISTINCT sheet_name FROM uploaded_pngs WHERE ip = ? ORDER BY sheet_name'
  ).all(ip);

  return rows.map(r => {
    const name = r.sheet_name;
    const label = LABEL_OVERRIDES[name]
      || name.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return { name, label };
  });
}

function storeUploadedPng(ip, sheetName, pngBuffer, originalName) {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO uploaded_pngs (ip, sheet_name, png, original_name, uploaded_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(ip, sheetName, pngBuffer, originalName || sheetName);
}

function getUploadedPng(ip, sheetName) {
  const d = getDb();
  const row = d.prepare(
    'SELECT png FROM uploaded_pngs WHERE ip = ? AND sheet_name = ?'
  ).get(ip, sheetName);
  return row ? Buffer.from(row.png) : null;
}

module.exports = {
  initDb,
  migrateExistingData,
  normaliseIp,
  loadSpriteData,
  loadSpriteDataSafe,
  saveSpriteData,
  listSpritesheets,
  storeUploadedPng,
  getUploadedPng,
};
