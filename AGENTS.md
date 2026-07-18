# Spritesheet Library — Agent Guide

## Overview

A web-based tool for extracting, annotating, and organizing individual sprites from sprite sheet images. React (Vite) frontend + Express backend, with per-IP data isolation in SQLite.

## Git Branch

Always work on `dev-build`. Master is production.

## Ports

| Environment | Static/Frontend | API |
|-------------|----------------|-----|
| Dev | 3030 (NGINX localhost) | 3031 (Express) |
| Prod | 4030 (NGINX) | 4031 (systemd: mushroom-spritesheet-api) |

Server uses `process.env.PORT || 3031`.

## Architecture

```
NGINX (3030/4030) → Vite build files
NGINX /api/* → Express (3031/4031)
Express → SQLite (server/data.db)
```

- NGINX serves the built React app and proxies `/api/` to the backend
- NGINX forwards real client IP via `X-Forwarded-For` and `CF-Connecting-IP`
- The Express app's `trust proxy` setting is enabled

## Per-IP Data Isolation

Each browser session gets its own workspace scoped to their IP address. No user accounts or auth.

**IP detection:** The server checks `req.headers['cf-connecting-ip']` first (set by Cloudflare Tunnel), then falls back to `req.ip` (from X-Forwarded-For via NGINX).

**Data storage:** SQLite at `server/data.db` (gitignored). Two tables:

```sql
sprite_data(ip, sheet_name, data, updated_at)       -- JSON metadata blobs
uploaded_pngs(ip, sheet_name, png, original_name, uploaded_at)  -- PNG BLOBs
```

## Upload Limits

| Limit | Value |
|-------|-------|
| Max file size | 2 MB |
| Max sheets per IP | 10 |
| Max storage per IP | 10 MB |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/spritesheets` | List spritesheets for requesting IP |
| `GET` | `/api/sprite-data/:sheetName` | Load sprite/group data |
| `PUT` | `/api/sprite-data/:sheetName` | Update a single sprite (auto-save) |
| `PUT` | `/api/groups/:sheetName` | Replace full groups array (auto-save) |
| `DELETE` | `/api/groups/:sheetName/:groupId` | Remove a group by ID |
| `PUT` | `/api/sprite-settings/:sheetName` | Save terrain categories + collection names |
| `POST` | `/api/upload` | Upload spritesheet PNG + optional JSON |
| `DELETE` | `/api/spritesheets/:sheetName` | Delete a spritesheet and its data |
| `GET` | `/api/spritesheet-img/:sheetName` | Serve spritesheet PNG (scoped to IP) |
| `GET` | `/api/download/png/:sheetName` | Download spritesheet PNG |
| `GET` | `/api/download/json/:sheetName` | Download JSON data |
| `GET` | `/api/download/all` | Download all sheets as ZIP |

## Express ETag Caveat

`res.json()` sets ETags that cause 304 responses on repeat calls. When debugging data changes, use `res.end(JSON.stringify(data))` instead to force fresh responses.

## Sprite Data Format

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

## Default Spritesheets

Two shared reference sheets in `public/spritesheets/`:
- `base_out_atlas.png` — 1024×1024, 1024 sprites (32×32)
- `terrain_atlas.png` — 1024×1024, 1024 sprites (32×32)

## Default Data Migration

On first startup, existing files from `server/data/` (JSON) and `public/spritesheets/` (PNGs) are auto-migrated into SQLite for `127.0.0.1`. New IPs start empty.

## Running

```sh
cd server && node index.js
```

## Git Identity

Use `<hermes_profile_name> <sporeaibot@gmail.com>` (e.g. `MycelBot <sporeaibot@gmail.com>`). Load the SSH key with `ssh-add ~/.ssh/sporeAIBot_github` before pushing.
