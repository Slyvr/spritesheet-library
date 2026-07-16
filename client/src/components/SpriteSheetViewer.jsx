import { useState, useRef, useEffect, useCallback } from 'react'
import './SpriteSheetViewer.css'

const SPRITE_SIZE = 32
const SCALE_FACTORS = [1, 2, 3, 4]

const GROUP_COLORS = [
  'rgba(233, 69, 96, 0.35)',
  'rgba(76, 175, 80, 0.30)',
  'rgba(33, 150, 243, 0.30)',
  'rgba(255, 193, 7, 0.35)',
  'rgba(156, 39, 176, 0.30)',
  'rgba(255, 87, 34, 0.30)',
  'rgba(0, 188, 212, 0.30)',
  'rgba(233, 30, 99, 0.30)',
]

export default function SpriteSheetViewer({
  spritesheetUrl,
  spriteData,
  mode,
  selectedRow,
  selectedCol,
  selectedGroupId,
  onSelectSprite,
  onCreateGroup,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(3)
  const [dragStart, setDragStart] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef(null)
  const [dimensions, setDimensions] = useState(null)

  // Group drag state
  const [groupDragStart, setGroupDragStart] = useState(null)
  const [groupDragCurrent, setGroupDragCurrent] = useState(null)
  const selectionRectRef = useRef(null)

  // Load the spritesheet image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      setDimensions({ width: img.width, height: img.height })
    }
    img.src = spritesheetUrl
  }, [spritesheetUrl])

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current || !spriteData) return

    const img = imageRef.current
    const ctx = canvas.getContext('2d')
    const scale = zoom

    canvas.width = img.width * scale
    canvas.height = img.height * scale

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offset.x, offset.y)

    // Draw the spritesheet scaled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale)

    // Draw group color overlays (hide in sprite mode)
    const groups = spriteData.groups || []
    if (mode !== 'sprite') {
      groups.forEach((group, gi) => {
        const color = GROUP_COLORS[gi % GROUP_COLORS.length]
        ctx.fillStyle = color
        for (const cell of group.cells) {
          ctx.fillRect(
            cell.col * SPRITE_SIZE * scale,
            cell.row * SPRITE_SIZE * scale,
            SPRITE_SIZE * scale,
            SPRITE_SIZE * scale
          )
        }
      })
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 0.5
    for (let r = 0; r <= spriteData.rows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * SPRITE_SIZE * scale)
      ctx.lineTo(img.width * scale, r * SPRITE_SIZE * scale)
      ctx.stroke()
    }
    for (let c = 0; c <= spriteData.columns; c++) {
      ctx.beginPath()
      ctx.moveTo(c * SPRITE_SIZE * scale, 0)
      ctx.lineTo(c * SPRITE_SIZE * scale, img.height * scale)
      ctx.stroke()
    }

    // Highlight selected sprite
    if (mode === 'sprite' && selectedRow !== null && selectedCol !== null) {
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 3
      ctx.strokeRect(
        selectedCol * SPRITE_SIZE * scale,
        selectedRow * SPRITE_SIZE * scale,
        SPRITE_SIZE * scale,
        SPRITE_SIZE * scale
      )
    }

    // Highlight selected group's cells with a bolder border
    if (selectedGroupId) {
      const selGroup = groups.find(g => g.id === selectedGroupId)
      if (selGroup) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        for (const cell of selGroup.cells) {
          ctx.strokeRect(
            cell.col * SPRITE_SIZE * scale,
            cell.row * SPRITE_SIZE * scale,
            SPRITE_SIZE * scale,
            SPRITE_SIZE * scale
          )
        }
      }
    }

    // Draw drag selection rectangle (group mode)
    if (groupDragStart && groupDragCurrent) {
      const gs = groupDragStart
      const gc = groupDragCurrent
      const x = Math.min(gs.x, gc.x) * SPRITE_SIZE * scale + offset.x / scale * scale
      const y = Math.min(gs.y, gc.y) * SPRITE_SIZE * scale + offset.y / scale * scale
      // Redo properly in canvas coords
      const rx = Math.min(gs.x, gc.x) * SPRITE_SIZE * scale
      const ry = Math.min(gs.y, gc.y) * SPRITE_SIZE * scale
      const rw = (Math.abs(gc.x - gs.x) + 1) * SPRITE_SIZE * scale
      const rh = (Math.abs(gc.y - gs.y) + 1) * SPRITE_SIZE * scale

      ctx.fillStyle = 'rgba(233, 69, 96, 0.15)'
      ctx.fillRect(rx, ry, rw, rh)
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.setLineDash([])
    }

    // Draw titles for sprites that have them
    ctx.font = `${Math.max(9, scale * 3)}px sans-serif`
    ctx.textAlign = 'center'
    for (const sprite of spriteData.sprites) {
      if (sprite.title) {
        const cx = sprite.col * SPRITE_SIZE * scale + (SPRITE_SIZE * scale) / 2
        const cy = sprite.row * SPRITE_SIZE * scale + (SPRITE_SIZE * scale) - 3
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        const textWidth = ctx.measureText(sprite.title).width
        ctx.fillRect(cx - textWidth / 2 - 2, cy - 8, textWidth + 4, 11)
        ctx.fillStyle = '#fff'
        ctx.fillText(sprite.title, cx, cy)
      }
    }

    ctx.restore()
  }, [zoom, offset, spriteData, selectedRow, selectedCol, selectedGroupId, mode, groupDragStart, groupDragCurrent, dimensions])

  useEffect(() => {
    draw()
  }, [draw])

  // Attach wheel listener as non-passive so preventDefault works
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -1 : 1
      const idx = SCALE_FACTORS.indexOf(zoom)
      if (idx === -1) {
        setZoom(SCALE_FACTORS[Math.max(0, Math.min(SCALE_FACTORS.length - 1, Math.round(zoom) + delta))])
      } else {
        const newIdx = Math.max(0, Math.min(SCALE_FACTORS.length - 1, idx + delta))
        setZoom(SCALE_FACTORS[newIdx])
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoom])

  const getGridCoords = (clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return null

    const rect = canvas.getBoundingClientRect()
    const scale = zoom
    const x = (clientX - rect.left - offset.x) / scale
    const y = (clientY - rect.top - offset.y) / scale

    if (x < 0 || y < 0) return null

    const col = Math.floor(x / SPRITE_SIZE)
    const row = Math.floor(y / SPRITE_SIZE)

    if (col >= spriteData.columns || row >= spriteData.rows) return null

    return { row, col }
  }

  const handleClick = (e) => {
    // Group mode already handles click+drag; skip simple clicks during drag
    if (mode === 'group' && groupDragStart) return
    const coords = getGridCoords(e.clientX, e.clientY)
    if (coords) {
      onSelectSprite(coords.row, coords.col)
    }
  }

  const handleMouseDown = (e) => {
    // Middle mouse button or alt+click for panning
    if (e.button === 1 || e.altKey) {
      e.preventDefault()
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      return
    }

    // Group mode: start drag selection
    if (mode === 'group' && e.button === 0) {
      const coords = getGridCoords(e.clientX, e.clientY)
      if (coords) {
        setGroupDragStart(coords)
        setGroupDragCurrent(coords)
      }
    }
  }

  const handleMouseMove = (e) => {
    if (dragStart) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      return
    }

    if (mode === 'group' && groupDragStart) {
      const coords = getGridCoords(e.clientX, e.clientY)
      if (coords) {
        setGroupDragCurrent(coords)
      }
    }
  }

  const handleMouseUp = () => {
    if (groupDragStart && groupDragCurrent) {
      const minRow = Math.min(groupDragStart.row, groupDragCurrent.row)
      const maxRow = Math.max(groupDragStart.row, groupDragCurrent.row)
      const minCol = Math.min(groupDragStart.col, groupDragCurrent.col)
      const maxCol = Math.max(groupDragStart.col, groupDragCurrent.col)

      const cells = []
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          cells.push({ row: r, col: c })
        }
      }

      if (cells.length >= 2) {
        onCreateGroup(cells)
      }
    }

    setGroupDragStart(null)
    setGroupDragCurrent(null)
    setDragStart(null)
  }

  return (
    <div className="spritesheet-viewer">
      <div className="viewer-toolbar">
        <span className="zoom-label">
          Zoom: {zoom}x
        </span>
        <div className="zoom-controls">
          {SCALE_FACTORS.map(f => (
            <button
              key={f}
              className={`zoom-btn ${zoom === f ? 'active' : ''}`}
              onClick={() => setZoom(f)}
            >
              {f}x
            </button>
          ))}
        </div>
        <span className={`mode-indicator ${mode}`}>
          {mode === 'group' ? 'Group  mode — drag to select sprites' : 'Sprite mode — click to select'}
        </span>
        <span className="dimension-label">
          {dimensions ? `${dimensions.width}×${dimensions.height}` : ''}
        </span>
        <span className="hint-label">
          Alt+click/drag to pan · Scroll to zoom
        </span>
      </div>
      <div
        className="canvas-container"
        ref={containerRef}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: dragStart ? 'grabbing'
                 : mode === 'group' && groupDragStart ? 'crosshair'
                 : mode === 'group' ? 'cell'
                 : 'crosshair'
          }}
        />
      </div>
    </div>
  )
}
