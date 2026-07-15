import { useState, useEffect, useRef } from 'react'
import './SpriteInfoPanel.css'

export default function SpriteInfoPanel({ sprite, spritesheetName, onUpdate }) {
  const [title, setTitle] = useState(sprite.title || '')
  const [description, setDescription] = useState(sprite.description || '')
  const titleTimer = useRef(null)
  const descTimer = useRef(null)

  // Reset when sprite selection changes
  useEffect(() => {
    setTitle(sprite.title || '')
    setDescription(sprite.description || '')
  }, [sprite.row, sprite.col, sprite.title, sprite.description])

  const scheduleSave = (field, value) => {
    const timer = field === 'title' ? titleTimer : descTimer
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const updated = {
        ...sprite,
        row: sprite.row,
        col: sprite.col,
        x: sprite.col * 32,
        y: sprite.row * 32,
        title: field === 'title' ? value : title,
        description: field === 'description' ? value : description,
      }
      onUpdate(updated)
    }, 400)
  }

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    scheduleSave('title', val)
  }

  const handleDescChange = (e) => {
    const val = e.target.value
    setDescription(val)
    scheduleSave('description', val)
  }

  return (
    <div className="sprite-info-panel">
      <h2 className="panel-title">Sprite Info</h2>

      <div className="sprite-preview">
        <div
          className="preview-canvas"
          style={{
            width: 96,
            height: 96,
            position: 'relative',
            overflow: 'hidden',
            background: '#0d0d1f',
            border: '1px solid #0f3460',
            borderRadius: 4,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              backgroundImage: `url(/spritesheets/${spritesheetName})`,
              backgroundPosition: `-${sprite.col * 96}px -${sprite.row * 96}px`,
              backgroundSize: `${(32 * 96) / 32}px ${(32 * 96) / 32}px`,
              imageRendering: 'pixelated',
            }}
          />
        </div>
      </div>

      <div className="sprite-coords">
        <div className="coord-row">
          <span className="coord-label">Position</span>
          <span className="coord-value">Row {sprite.row}, Col {sprite.col}</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Pixel Coords</span>
          <span className="coord-value">({sprite.col * 32}, {sprite.row * 32})</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Size</span>
          <span className="coord-value">32 × 32 px</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Sprite ID</span>
          <span className="coord-value">#{sprite.row * 32 + sprite.col}</span>
        </div>
      </div>

      <div className="sprite-fields">
        <div className="field-group">
          <label htmlFor="sprite-title">Title</label>
          <input
            id="sprite-title"
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter sprite title..."
          />
        </div>

        <div className="field-group">
          <label htmlFor="sprite-desc">Description</label>
          <textarea
            id="sprite-desc"
            value={description}
            onChange={handleDescChange}
            placeholder="Enter sprite description..."
            rows={5}
          />
        </div>
      </div>

      <div className="auto-save-indicator">
        <span className="dot" />
        Auto-save enabled
      </div>
    </div>
  )
}
