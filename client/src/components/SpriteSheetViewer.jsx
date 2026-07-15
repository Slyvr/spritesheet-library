import { useState, useRef, useEffect, useCallback } from 'react'
import './SpriteSheetViewer.css'

const SPRITE_SIZE = 32
const SCALE_FACTORS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]

export default function SpriteSheetViewer({
  spritesheetUrl,
  spriteData,
  selectedRow,
  selectedCol,
  onSelectSprite,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState(3)
  const [dragStart, setDragStart] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef(null)
  const [dimensions, setDimensions] = useState(null)

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

    // Apply pan offset
    ctx.translate(offset.x, offset.y)

    // Draw the spritesheet scaled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale)

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
    if (selectedRow !== null && selectedCol !== null) {
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 3
      ctx.strokeRect(
        selectedCol * SPRITE_SIZE * scale,
        selectedRow * SPRITE_SIZE * scale,
        SPRITE_SIZE * scale,
        SPRITE_SIZE * scale
      )
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
  }, [zoom, offset, spriteData, selectedRow, selectedCol])

  useEffect(() => {
    draw()
  }, [draw])

  const getSpriteCoords = (clientX, clientY) => {
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
    const coords = getSpriteCoords(e.clientX, e.clientY)
    if (coords) {
      onSelectSprite(coords.row, coords.col)
    }
  }

  const handleMouseDown = (e) => {
    // Middle mouse button for panning
    if (e.button === 1 || e.altKey) {
      e.preventDefault()
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e) => {
    if (dragStart) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setDragStart(null)
  }

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

  return (
    <div className="spritesheet-viewer">
      <div className="viewer-toolbar">
        <span className="zoom-label">
          Zoom: {zoom}x
        </span>
        <div className="zoom-controls">
          {SCALE_FACTORS.filter(f => f <= 10).map(f => (
            <button
              key={f}
              className={`zoom-btn ${zoom === f ? 'active' : ''}`}
              onClick={() => setZoom(f)}
            >
              {f}x
            </button>
          ))}
        </div>
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
          style={{ cursor: dragStart ? 'grabbing' : 'crosshair' }}
        />
      </div>
    </div>
  )
}
