# Sprite Sheet Tool

A web-based tool for extracting, annotating, and mapping individual sprites from sprite sheet images. Works with 32×32 pixel sprites on 1024×1024 sprite sheets (32×32 grid — 1024 sprites per sheet).

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

### 2. Sprite Info Panel

When a sprite is selected, the right panel shows:

- **Preview** — 96×96 pixel close-up of the sprite at 3× scale
- **Coordinates** — row, column, pixel position (x, y), sprite ID
- **Title** — text input, auto-saves after 400ms debounce
- **Description** — multiline textarea, auto-saves
- **Tags** — inline chip input. Type a tag and press Enter to add; click × to remove. Tags are lowercased and deduplicated.
- **Auto-save indicator** — green dot "Auto-save enabled", yellow dot "Saving..."

### 3. Group Mode

A toggle in the vertical mode strip switches between **Sprite** and **Group** mode.

- **Group mode** — drag across the canvas to draw a dashed selection rectangle. Releasing creates a group containing every 32×32 cell inside the rectangle.
- Groups appear as color-coded semi-transparent overlays on the canvas (cycling through 8 colors).
- The info panel shows group metadata: cell count, grid dimensions (row/col ranges).
- Groups have their own title, description, and can be deleted.
- Groups are stored in the same JSON data file as sprites.

### 4. Sprite Collections Tab

A separate tab (green accent) that provides a tag-driven overview.

- **Left panel** — lists every unique tag across all sprites, sorted alphabetically, with sprite counts.
- **Right panel** — selecting a tag shows every sprite with that tag, rendered in a grid at 2.5× scale.
- **Constraint dots** — each sprite cell has 8 clickable dots at corners and edge midpoints (tl, tc, tr, ml, mr, bl, bc, br). Toggling a dot green marks that edge/corner as "constrained" — meaning it must match the adjacent tile type.
- Constraints are stored directly on each sprite object and auto-saved via the sprite PUT endpoint.

---

## Data Model

All data lives in JSON files at `server/data/`, one per sprite sheet.

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
  "constraints": ["tl", "tc", "tr"]
}
```

### Group object

```json
{
  "id": "g1",
  "cells": [
    {"row": 0, "col": 0, "constraints": ["tl", "tc"]},
    {"row": 0, "col": 1}
  ],
  "title": "Grass Corner Set",
  "description": "Top-left grass corner variants"
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
  "groups": [...]
}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sprite-data/:sheetName` | Load all sprite and group data |
| `PUT` | `/api/sprite-data/:sheetName` | Update a single sprite (auto-save) |
| `PUT` | `/api/groups/:sheetName` | Replace the full groups array |
| `DELETE` | `/api/groups/:sheetName/:groupId` | Remove a group by ID |

All endpoints accept and return JSON via `Content-Type: application/json`.

---

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  NGINX   │────▶│  React   │     │  Node.js     │
│  :3005   │     │  (Vite)  │     │  Express     │
│          │     │  build/  │     │  :3011       │
│  /api/*  │────▶│          │────▶│  server/     │
│  → :3011 │     │          │     │  data/*.json │
│          │     │          │     │              │
│  /sprites│     │          │     │              │
│  heets/* │────▶│  public/ │     │              │
└──────────┘     └──────────┘     └──────────────┘
```

- **NGINX** serves the built React app, proxies `/api/` to the backend, and serves sprite sheet PNGs directly with long-lived cache headers.
- **React (Vite)** handles all UI — canvas rendering, state management, auto-save debouncing.
- **Node.js (Express)** provides a thin REST layer over JSON data files. No database.

---

## Project Structure

```
sprite-sheet-tool/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx            # Main app: routing, state, API calls
│   │   ├── App.css
│   │   ├── main.jsx           # Entry point
│   │   ├── index.css
│   │   └── components/
│   │       ├── SpriteSheetViewer.jsx/css   # Canvas, zoom, pan, drag-select
│   │       ├── SpriteInfoPanel.jsx/css     # Sprite/group editor sidebar
│   │       └── SpriteCollectionsView.jsx/css  # Tag-based collections view
│   ├── index.html
│   └── vite.config.js
├── server/                    # Node.js backend
│   ├── index.js               # Express server, REST API
│   ├── package.json
│   └── data/                  # Auto-generated JSON data files
├── public/spritesheets/       # Sprite sheet PNGs
├── nginx/
│   └── sprite-sheet-tool.conf
├── start-server.sh
├── .gitignore
└── README.md
```

---

## Sprite Sheets

Two sprite sheets are included:

| File | Size | Sprites | Source |
|------|------|---------|--------|
| `base_out_atlas.png` | 1024×1024 | 1024 (32×32) | Atlas.zip |
| `terrain_atlas.png` | 1024×1024 | 1024 (32×32) | Atlas.zip |

Both use 32×32 pixel sprites arranged in a 32-column × 32-row grid.

---

## Future Ideas

- Export constraints as a tile connection mask for use in game engines
- Visual preview of tile adjacency (show how constrained edges match)
- Sprite sheet upload via the UI
- Search/filter by title or description
- Batch tag operations
