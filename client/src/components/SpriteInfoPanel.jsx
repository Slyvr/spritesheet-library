import { useState, useEffect, useRef } from 'react'
import './SpriteInfoPanel.css'

export default function SpriteInfoPanel({ sprite, group, spritesheetName, onUpdate, onUpdateGroup, onDeleteGroup }) {
  // If a group prop is provided, render as group editor
  if (group) {
    return <GroupEditor group={group} spritesheetName={spritesheetName} onUpdateGroup={onUpdateGroup} onDeleteGroup={onDeleteGroup} />
  }
  // Otherwise render as sprite editor
  return <SpriteEditor sprite={sprite} spritesheetName={spritesheetName} onUpdate={onUpdate} />
}

function SpriteEditor({ sprite, spritesheetName, onUpdate }) {
  const [title, setTitle] = useState(sprite.title || '')
  const [description, setDescription] = useState(sprite.description || '')
  const titleTimer = useRef(null)
  const descTimer = useRef(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setTitle(sprite.title || '')
    setDescription(sprite.description || '')
    setDirty(false)
  }, [sprite.row, sprite.col, sprite.title, sprite.description])

  const scheduleSave = useRef((field, val) => {
    clearTimeout(titleTimer.current)
    clearTimeout(descTimer.current)
    const timer = setTimeout(() => {
      onUpdate({
        ...sprite,
        row: sprite.row,
        col: sprite.col,
        x: sprite.col * 32,
        y: sprite.row * 32,
        title,
        description,
      })
      setDirty(false)
    }, 400)
    field === 'title' ? (titleTimer.current = timer) : (descTimer.current = timer)
    setDirty(true)
  }).current

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
      <SpritePreview sprite={sprite} spritesheetName={spritesheetName} />
      <SpriteCoords sprite={sprite} />
      <div className="sprite-fields">
        <div className="field-group">
          <label htmlFor="sprite-title">Title</label>
          <input id="sprite-title" type="text" value={title} onChange={handleTitleChange} placeholder="Enter sprite title..." />
        </div>
        <div className="field-group">
          <label htmlFor="sprite-desc">Description</label>
          <textarea id="sprite-desc" value={description} onChange={handleDescChange} placeholder="Enter sprite description..." rows={5} />
        </div>
      </div>
      <AutoSaveIndicator dirty={dirty} />
    </div>
  )
}

function GroupEditor({ group, spritesheetName, onUpdateGroup, onDeleteGroup }) {
  const [title, setTitle] = useState(group.title || '')
  const [description, setDescription] = useState(group.description || '')
  const titleTimer = useRef(null)
  const descTimer = useRef(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setTitle(group.title || '')
    setDescription(group.description || '')
    setDirty(false)
  }, [group.id, group.title, group.description])

  const scheduleSave = useRef((field, val) => {
    clearTimeout(titleTimer.current)
    clearTimeout(descTimer.current)
    const timer = setTimeout(() => {
      onUpdateGroup({
        ...group,
        title,
        description,
      })
      setDirty(false)
    }, 400)
    field === 'title' ? (titleTimer.current = timer) : (descTimer.current = timer)
    setDirty(true)
  }).current

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

  const handleDelete = () => {
    if (confirm('Delete this sprite group?')) {
      onDeleteGroup(group.id)
    }
  }

  const cellCount = group.cells?.length || 0
  const minRow = Math.min(...group.cells.map(c => c.row))
  const maxRow = Math.max(...group.cells.map(c => c.row))
  const minCol = Math.min(...group.cells.map(c => c.col))
  const maxCol = Math.max(...group.cells.map(c => c.col))
  const gridW = maxCol - minCol + 1
  const gridH = maxRow - minRow + 1

  return (
    <div className="sprite-info-panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Group Info</h2>
        <span className="group-badge">GROUP</span>
      </div>

      <div className="sprite-coords">
        <div className="coord-row">
          <span className="coord-label">Sprites</span>
          <span className="coord-value">{cellCount} cells</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Grid size</span>
          <span className="coord-value">{gridW} × {gridH}</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Rows</span>
          <span className="coord-value">{minRow}–{maxRow}</span>
        </div>
        <div className="coord-row">
          <span className="coord-label">Cols</span>
          <span className="coord-value">{minCol}–{maxCol}</span>
        </div>
      </div>

      <div className="sprite-fields">
        <div className="field-group">
          <label htmlFor="group-title">Group Title</label>
          <input id="group-title" type="text" value={title} onChange={handleTitleChange} placeholder="Enter group title..." />
        </div>
        <div className="field-group">
          <label htmlFor="group-desc">Group Description</label>
          <textarea id="group-desc" value={description} onChange={handleDescChange} placeholder="Enter group description..." rows={5} />
        </div>
      </div>

      <button className="delete-btn" onClick={handleDelete}>
        Delete Group
      </button>

      <AutoSaveIndicator dirty={dirty} />
    </div>
  )
}

function SpritePreview({ sprite, spritesheetName }) {
  return (
    <div className="sprite-preview">
      <div className="preview-canvas" style={{ width: 96, height: 96, position: 'relative', overflow: 'hidden', background: '#0d0d1f', border: '1px solid #0f3460', borderRadius: 4 }}>
        <div style={{
          width: 96, height: 96,
          backgroundImage: `url(/spritesheets/${spritesheetName})`,
          backgroundPosition: `-${sprite.col * 96}px -${sprite.row * 96}px`,
          backgroundSize: `${(32 * 96) / 32}px ${(32 * 96) / 32}px`,
          imageRendering: 'pixelated',
        }} />
      </div>
    </div>
  )
}

function SpriteCoords({ sprite }) {
  return (
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
  )
}

function AutoSaveIndicator({ dirty }) {
  return (
    <div className={`auto-save-indicator ${dirty ? 'dirty' : ''}`}>
      <span className="dot" />
      {dirty ? 'Saving...' : 'Auto-save enabled'}
    </div>
  )
}
