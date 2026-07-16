# Spritesheet Library

A web-based tool for extracting, annotating, and organizing individual sprites from sprite sheet images. Each visitor gets their own isolated workspace — uploads, annotations, and settings are scoped to their IP address.

---

## Quick Start

```bash
# Start the backend
cd server && node index.js

# Backend runs on :3011, frontend served via NGINX on :3005
# Open http://localhost:3005
```

**Public access:** `https://spritesheetlibrary.mushroomhollow.dev` (via Cloudflare tunnel)

---

## Features

### Spritesheet Viewer

Canvas-based viewer with configurable zoom (1×–20×), pixel-perfect rendering, click-to-select, scroll-to-zoom, and middle-click-to-pan.

### Tab Bar (Sprite | Group | Terrain | Collections | Settings)

| Tab | What it does |
|-----|-------------|
| **Sprite** | View and click individual sprites on the canvas. Right panel shows sprite metadata for editing. |
| **Group** | Draw drag-selection rectangles on the canvas to create sprite groups with color-coded overlays. |
| **Terrain** | Lists terrain categories with sprite and group counts. Shows assigned sprites with constraint dots. |
| **Collections** | Lists collection names with sprite counts. Click a sprite to open its info panel. |
| **Settings** | Inline editor for terrain categories and collection names. Auto-saves. |

### Sprite Info Panel

Preview, coordinates, title, description, tags (chip input), terrain category dropdown, collection name dropdown, and 8 constraint dots (corners + edge midpoints).

### Group Info Panel

Cell count, grid dimensions, title, description, terrain category, collection name, and delete button.

### Sidebar

- **Upload** — upload a spritesheet PNG plus optional JSON metadata
- **Download All** — download all your sheets as a ZIP archive
- **Sheets** — list of your spritesheets with per-sheet download buttons (PNG + JSON) and a red **X** to delete with confirmation

The sidebar collapses via the hamburger icon.

### Per-IP Isolation

Each browser session gets its own workspace. A new visitor sees a centered "No spritesheets uploaded yet" message. Uploaded sheets and all annotations are visible only to the uploader's IP address.

### Upload Limits

To keep things fair in a public deployment:

| Limit | Value |
|-------|-------|
| Max file size | 2 MB |
| Max sheets per IP | 10 |
| Max storage per IP | 10 MB |

Exceeding any limit returns a clear error message.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/spritesheets` | List spritesheets visible to the requesting IP |
| `GET` | `/api/sprite-data/:sheetName` | Load sprite and group data for a sheet |
| `PUT` | `/api/sprite-data/:sheetName` | Update a single sprite (auto-save) |
| `PUT` | `/api/groups/:sheetName` | Replace the full groups array |
| `DELETE` | `/api/groups/:sheetName/:groupId` | Remove a group by ID |
| `PUT` | `/api/sprite-settings/:sheetName` | Save terrain categories and collection names |
| `POST` | `/api/upload` | Upload spritesheet PNG + optional JSON (per-IP, rate-limited) |
| `DELETE` | `/api/spritesheets/:sheetName` | Delete a spritesheet and its data |
| `GET` | `/api/spritesheet-img/:sheetName` | Serve a spritesheet PNG (scoped to IP) |
| `GET` | `/api/download/png/:sheetName` | Download a spritesheet PNG |
| `GET` | `/api/download/json/:sheetName` | Download a sheet's JSON data |
| `GET` | `/api/download/all` | Download all sheets as a ZIP archive |

All endpoints return JSON. Upload uses `multipart/form-data`. ZIP downloads use `application/zip`.

---

## Architecture

```
┌──────────┐     ┌──────────┐     ┌─────────────────┐
│  NGINX   │────▶│  React   │     │  Node.js        │
│  :3005   │     │  (Vite)  │     │  Express         │
│          │     │  build/  │     │  :3011           │
│  /api/*  │────▶│          │────▶│  server/         │
│  → :3011 │     │          │     │  ├─ index.js     │
│          │     │          │     │  ├─ db.js        │
│  X-Real- │     │          │     │  └─ data.db      │
│  IP /    │     │          │     │     (SQLite)     │
│  X-For-  │     │          │     │                  │
│  warded- │     │          │     │  public/         │
│  For     │     │          │     │  spritesheets/   │
└──────────┘     └──────────┘     └─────────────────┘
```

- **NGINX** serves the built React app, proxies `/api/` to the backend, forwards the real client IP via `X-Forwarded-For`, and enforces a 3 MB `client_max_body_size` on uploads. NGINX returns JSON for 413 errors instead of HTML.
- **React (Vite)** handles all UI — canvas, state management, auto-save, group selection, settings.
- **Node.js (Express)** provides a REST API backed by **SQLite** (`node:sqlite`). Data is stored per-IP in two tables: `sprite_data` (JSON metadata blobs) and `uploaded_pngs` (PNG BLOBs).

---

## Data Storage

Previously file-based JSON, now using **SQLite** (`server/data.db`). Two tables:

```sql
sprite_data(ip, sheet_name, data, updated_at)
uploaded_pngs(ip, sheet_name, png, original_name, uploaded_at)
```

- `sprite_data` — JSON metadata for each sheet (sprites, groups, settings)
- `uploaded_pngs` — raw PNG binary blobs

The database is gitignored. On first startup, existing files from `server/data/` and `public/spritesheets/` are migrated into SQLite for the local IP. New IPs start empty.

### Sprite object

```json
{
  "id": 0, "row": 0, "col": 0, "x": 0, "y": 0,
  "title": "Grass Tile",
  "description": "Basic ground cover",
  "tags": ["grass", "ground"],
  "terrainCategory": "grass_normal",
  "collectionName": "rock_scatter",
  "constraints": ["tl", "tc", "tr"]
}
```

### Group object

```json
{
  "id": "g1",
  "cells": [{"row": 0, "col": 0}, {"row": 0, "col": 1}],
  "title": "Grass Corner Set",
  "description": "Top-left grass corner variants",
  "terrainCategory": "grass_normal",
  "collectionName": ""
}
```

---

## Project Structure

```
spritesheet-library/
├── client/                         # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                 # Main app: routing, state, API calls
│   │   ├── App.css                 # App layout styles
│   │   ├── main.jsx                # Entry point
│   │   ├── index.css               # Global styles
│   │   └── components/
│   │       ├── SpriteSheetViewer.jsx/css
│   │       ├── SpriteInfoPanel.jsx/css
│   │       ├── SpriteCollectionsView.jsx/css
│   │       ├── CollectionView.jsx
│   │       └── SheetSettings.jsx/css
│   ├── public/
│   │   └── favicon.png
│   ├── index.html
│   └── vite.config.js
├── server/                         # Node.js backend
│   ├── index.js                    # Express server, REST API
│   ├── db.js                       # SQLite queries (node:sqlite)
│   ├── data.db                     # SQLite database (gitignored)
│   ├── package.json
│   └── data/                       # Legacy JSON files (migrated on first run)
├── public/spritesheets/            # Shared spritesheet PNGs
├── nginx/
│   └── spritesheet-library.conf
├── start-server.sh
├── .gitignore
└── README.md
```

---

## Sprite Sheets

Two sheets are included by default as shared reference assets:

| File | Size | Sprites |
|------|------|---------|
| `base_out_atlas.png` | 1024×1024 | 1024 (32×32) |
| `terrain_atlas.png` | 1024×1024 | 1024 (32×32) |

Additional sheets can be uploaded via the sidebar Upload button.

---

## Configuration

**NGINX config** (`nginx/spritesheet-library.conf`):
- Serves `client/build/` as the web root
- Proxies `/api/` to `localhost:3011` with `X-Forwarded-For` for real client IP detection
- Limits upload body size to 3 MB, returns JSON on 413
- Caches static assets with immutable headers
- Handles SPA routing (non-file routes → `index.html`)

**Upload limits** are set in `server/index.js`:
```js
const MAX_FILE_SIZE = 2 * 1024 * 1024;      // 2 MB per file
const MAX_SHEETS_PER_IP = 10;                // 10 sheets per IP
const MAX_STORAGE_PER_IP = 10 * 1024 * 1024; // 10 MB total per IP
```
