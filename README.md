# Spritesheet Library

A web-based tool for extracting, annotating, and organizing individual sprites from sprite sheet images. Works with 32×32 pixel sprites on 1024×1024 sprite sheets (32×32 grid — 1024 sprites per sheet).

---

## Quick Start

```bash
# Start the backend
cd server && node index.js

# Open http://localhost:3005
# NGINX serves the frontend build and proxies /api/ to the backend
```

**Ports:** Frontend at `:3005` (NGINX), backend API at `:3011` (Node.js)

---

## Features

### 1. Spritesheet Viewer

Canvas-based viewer with the full spritesheet rendered at configurable zoom levels (1×–20×). Pixel-perfect rendering with `image-rendering: pixelated`.

- **Click** a sprite → highlighted with red border, info panel opens
- **Scroll wheel** → zoom in/out (non-passive listener prevents page scroll)
- **Alt+drag** or **middle-click+drag** → pan the view
- **Zoom toolbar** buttons for quick jumps to common levels

### 2. Tab Bar (Sprite | Group | Terrain | Collections | Settings)

A horizontal tab bar at the top of the content area switches between five modes:

| Tab | What it does |
|-----|-------------|
| **Sprite** | View and click individual sprites on the canvas. Right panel shows sprite metadata for editing. |
| **Group** | Draw drag-selection rectangles on the canvas to create sprite groups. Groups appear as color-coded overlays. |
| **Terrain** | Lists terrain categories (per-sheet) with sprite and group counts. Selecting a category shows assigned sprites (with constraint dots) and groups (expandable cards). |
| **Collections** | Lists collection names (per-sheet) with sprite counts. Selecting a collection shows its sprites. Click a sprite to open its info panel on the right for editing. |
| **Settings** | Inline editor for the sheet's terrain categories and collection names lists. Changes auto-save to the per-sheet JSON data. |

### 3. Sprite Info Panel

When a sprite is selected (via the canvas or Collections tab), the right panel shows:

- **Preview** — 96×96 pixel close-up of the sprite at 3× scale
- **Coordinates** — row, column, pixel position (x, y), sprite ID
- **Title** — text input, auto-saves after 400ms debounce
- **Description** — multiline textarea, auto-saves
- **Tags** — inline chip input. Type and press Enter to add; click × to remove
- **Terrain Category** — dropdown populated from the active sheet's settings
- **Collection Name** — dropdown populated from the active sheet's settings
- **Constraint Dots** — 8 clickable dots at corners and edge midpoints (tl, tc, tr, ml, mr, bl, bc, br). Toggle a dot green to mark that edge as "constrained" (must match adjacent tile type)

### 4. Group Info Panel

When a group is selected (via the canvas in Group mode), the right panel shows:

- **Metadata** — cell count, grid dimensions, row/col ranges
- **Title** — text input, auto-saves
- **Description** — textarea, auto-saves
- **Terrain Category** — dropdown populated from the active sheet's settings
- **Collection Name** — dropdown populated from the active sheet's settings
- **Delete button** — removes the group

### 5. Group Mode

- Switch to Group mode via the tab bar. Drag across the canvas to draw a dashed selection rectangle.
- Releasing creates a group containing every 32×32 cell inside the rectangle.
- Groups appear as color-coded semi-transparent overlays (cycling through 8 colors).
- Groups are stored in the same JSON data file as sprites.

### 6. Terrain View

- **Left panel** — lists all terrain categories from the active sheet's settings that have at least one sprite or group assigned, with counts.
- **Right panel** — selecting a category shows groups first (as **Group Cards** with preview, title, cell count, and GROUP badge), then individual sprites with constraint dots.
- **Group Cards** can be clicked to expand — showing every cell in the group as an individual sprite with full constraint-dot editing.

### 7. Collections View

- **Left panel** — lists collection names from the active sheet's settings with sprite counts.
- **Right panel** — selecting a collection shows its sprites in a grid with constraint dots.
- **Click a sprite** to open its full info panel on the right for editing title, description, tags, terrain category, and collection name.

### 8. Settings Tab

An inline view (not a modal) accessible via the **Settings** tab in the tab bar. Two tabs:

- **Terrain Category** — manage the list of terrain categories (add, delete). These populate the Terrain Category dropdown on sprites and groups.
- **Collection Name** — manage the list of collection names (add, delete). These populate the Collection Name dropdown on sprites and groups, and the Collections tab.

Each spritesheet has its own independent settings, stored in the sheet's JSON data file.

### 9. Sidebar

Left sidebar with three sections:

- **Upload** — upload a new spritesheet PNG (required) plus optional JSON data
- **Download All** — download all sheets as a ZIP archive
- **Sheets** — list of spritesheets (fetched dynamically from the server)

Each sheet in the list has per-sheet download buttons (PNG image + JSON data).

The sidebar is collapsible via the hamburger icon. Icons remain visible when collapsed; text labels hide.

#### Upload

Opens a native file picker accepting `.png` (required) and `.json` (optional) files. If only a PNG is provided, the server auto-generates default sprite metadata (1024 sprites with empty title/description). The list refreshes in-place after upload.

#### Download All

Streams a ZIP archive containing all spritesheet PNGs and their JSON data files. Files sit flat in the zip root (no subdirectories).

---

## Data Model

All data lives in per-sheet JSON files at `server/data/`, one per spritesheet.

### Sprite object

```json
{
  "id": 0,
  "row": 0,
  "col": 0,
  "x": 0,
  "y": 0,
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
  "cells": [
    {"row": 0, "col": 0},
    {"row": 0, "col": 1}
  ],
  "title": "Grass Corner Set",
  "description": "Top-left grass corner variants",
  "terrainCategory": "grass_normal",
  "collectionName": ""
}
```

### Data file structure

```json
{
  "spritesheet": "base_out_atlas.png",
  "spriteSize": 32,
  "columns": 32,
  "rows": 32,
  "sprites": [...1024 entries...],
  "groups": [...],
  "terrainCategories": ["dirt_light", "grass_normal", "stone"],
  "collectionNames": ["rock_scatter", "plant_scatter"]
}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/spritesheets` | List all available spritesheets |
| `GET` | `/api/sprite-data/:sheetName` | Load all sprite and group data for a sheet |
| `PUT` | `/api/sprite-data/:sheetName` | Update a single sprite (auto-save) |
| `PUT` | `/api/groups/:sheetName` | Replace the full groups array |
| `DELETE` | `/api/groups/:sheetName/:groupId` | Remove a group by ID |
| `PUT` | `/api/sprite-settings/:sheetName` | Save terrain categories and collection names for a sheet |
| `POST` | `/api/upload` | Upload a spritesheet PNG + optional JSON data |
| `GET` | `/api/download/png/:sheetName` | Download a spritesheet PNG |
| `GET` | `/api/download/json/:sheetName` | Download a sheet's JSON data |
| `GET` | `/api/download/all` | Download all sheets as a ZIP archive |

All endpoints accept and return JSON via `Content-Type: application/json`, except file uploads (multipart/form-data) and ZIP downloads (application/zip).

---

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  NGINX   │────▶│  React   │     │  Node.js     │
│  :3005   │     │  (Vite)  │     │  Express     │
│          │     │  build/  │     │  :3011       │
│  /api/*  │────▶│          │────▶│  server/     │
│  → :3011 │     │          │     │  data/       │
│          │     │          │     │  *.json      │
│  /sprites│     │          │     │              │
│  heets/* │────▶│  public/ │     │              │
└──────────┘     └──────────┘     └──────────────┘
```

- **NGINX** serves the built React app, proxies `/api/` to the backend, and serves sprite sheet PNGs directly with long-lived cache headers.
- **React (Vite)** handles all UI — canvas rendering, state management, auto-save debouncing, settings management.
- **Node.js (Express)** provides a thin REST layer over JSON data files. No database.

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
│   │       ├── SpriteSheetViewer.jsx/css    # Canvas, zoom, pan, drag-select
│   │       ├── SpriteInfoPanel.jsx/css      # Sprite/group editor sidebar
│   │       ├── SpriteCollectionsView.jsx/css # Terrain categories view
│   │       ├── CollectionView.jsx           # Collection names view
│   │       └── SheetSettings.jsx/css        # Per-sheet settings editor
│   ├── public/
│   │   └── favicon.png
│   ├── index.html
│   └── vite.config.js
├── server/                         # Node.js backend
│   ├── index.js                    # Express server, REST API
│   ├── package.json
│   └── data/                       # Per-sheet JSON data files
│       ├── base_out_atlas.json
│       ├── terrain_atlas.json
│       └── ... (auto-generated)
├── public/spritesheets/            # Spritesheet PNGs
├── nginx/
│   └── spritesheet-library.conf
├── start-server.sh
├── .gitignore
└── README.md
```

---

## Sprite Sheets

Two sprite sheets are included by default:

| File | Size | Sprites | Source |
|------|------|---------|--------|
| `base_out_atlas.png` | 1024×1024 | 1024 (32×32) | Atlas.zip |
| `terrain_atlas.png` | 1024×1024 | 1024 (32×32) | Atlas.zip |

Both use 32×32 pixel sprites arranged in a 32-column × 32-row grid.

Additional sheets can be uploaded via the sidebar Upload button.

---

## Configuration

Group IDs use `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)` for universal browser compatibility.

Settings (terrain categories and collection names) are stored per-sheet in each sheet's JSON data file, managed via the Settings tab in the UI.

### NGINX

The provided NGINX config handles:
- Static file serving for the build and spritesheet PNGs
- API proxy to the Node.js backend
- Long-lived cache headers for static assets
- SPA routing (all non-file routes fall through to `index.html`)
