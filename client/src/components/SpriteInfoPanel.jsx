import { useState, useEffect, useRef, useCallback } from 'react'
import './SpriteInfoPanel.css'

export default function SpriteInfoPanel({ sprite, group, spritesheetName, terrainCategories, onUpdate, onUpdateGroup, onDeleteGroup }) {
  if (group) {
    return <GroupEditor group={group} spritesheetName={spritesheetName} terrainCategories={terrainCategories} onUpdateGroup={onUpdateGroup} onDeleteGroup={onDeleteGroup} />
  }
  return <SpriteEditor sprite={sprite} spritesheetName={spritesheetName} terrainCategories={terrainCategories} onUpdate={onUpdate} />
}

function SpriteEditor({ sprite, spritesheetName, terrainCategories = [], onUpdate }) {
  const [title, setTitle] = useState(sprite.title || '')
  const [description, setDescription] = useState(sprite.description || '')
  const [terrainCategory, setTerrainCategory] = useState(sprite.terrainCategory || '')
  const [collectionName, setCollectionName] = useState(sprite.collectionName || '')
  const [tags, setTags] = useState(sprite.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [dirty, setDirty] = useState(false)
  const timer = useRef(null)

  const titleRef = useRef(title)
  const descRef = useRef(description)
  const terrainCategoryRef = useRef(terrainCategory)
  const collectionNameRef = useRef(collectionName)
  const tagsRef = useRef(tags)
  titleRef.current = title
  descRef.current = description
  terrainCategoryRef.current = terrainCategory
  collectionNameRef.current = collectionName
  tagsRef.current = tags

  useEffect(() => {
    setTitle(sprite.title || '')
    setDescription(sprite.description || '')
    setTerrainCategory(sprite.terrainCategory || '')
    setCollectionName(sprite.collectionName || '')
    setTags(sprite.tags || [])
    setDirty(false)
  }, [sprite.row, sprite.col, sprite.title, sprite.description, sprite.terrainCategory, sprite.collectionName, sprite.tags])

  const save = useCallback(() => {
    onUpdate({
      ...sprite,
      row: sprite.row,
      col: sprite.col,
      x: sprite.col * 32,
      y: sprite.row * 32,
      title: titleRef.current,
      description: descRef.current,
      terrainCategory: terrainCategoryRef.current,
      collectionName: collectionNameRef.current,
      tags: tagsRef.current,
    })
    setDirty(false)
  }, [sprite, onUpdate])

  const schedule = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 400)
    setDirty(true)
  }, [save])

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    schedule()
  }

  const handleDescChange = (e) => {
    setDescription(e.target.value)
    schedule()
  }

  const handleTerrainCategoryChange = (e) => {
    setTerrainCategory(e.target.value)
    schedule()
  }

  const handleCollectionNameChange = (e) => {
    setCollectionName(e.target.value)
    schedule()
  }

  const addTag = (e) => {
    const val = tagInput.trim().toLowerCase()
    if (e.key === 'Enter' && val && !tags.includes(val)) {
      const next = [...tags, val]
      setTags(next)
      setTagInput('')
      tagsRef.current = next
      schedule()
    }
  }

  const removeTag = (tag) => {
    const next = tags.filter(t => t !== tag)
    setTags(next)
    tagsRef.current = next
    schedule()
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
        <div className="field-group">
          <label>Tags</label>
          <div className="tag-chips">
            {tags.map(tag => (
              <span key={tag} className="tag-chip">
                {tag}
                <button className="tag-remove" onClick={() => removeTag(tag)}>&times;</button>
              </span>
            ))}
            <input
              className="tag-input"
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder={tags.length ? 'Add tag...' : 'Type a tag and press Enter...'}
            />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="sprite-terrain">Terrain Category</label>
          <select id="sprite-terrain" value={terrainCategory} onChange={handleTerrainCategoryChange}>
            <option value="">—</option>
            {terrainCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="sprite-collection">Collection Name</label>
          <input id="sprite-collection" type="text" value={collectionName} onChange={handleCollectionNameChange} placeholder="e.g. starter_house, ruins_a..." />
        </div>
      </div>
      <AutoSaveIndicator dirty={dirty} />
    </div>
  )
}

function GroupEditor({ group, spritesheetName, terrainCategories = [], onUpdateGroup, onDeleteGroup }) {
  const [title, setTitle] = useState(group.title || '')
  const [description, setDescription] = useState(group.description || '')
  const [terrainCategory, setTerrainCategory] = useState(group.terrainCategory || '')
  const [collectionName, setCollectionName] = useState(group.collectionName || '')
  const [dirty, setDirty] = useState(false)
  const timer = useRef(null)

  const titleRef = useRef(title)
  const descRef = useRef(description)
  const terrainCategoryRef = useRef(terrainCategory)
  const collectionNameRef = useRef(collectionName)
  titleRef.current = title
  descRef.current = description
  terrainCategoryRef.current = terrainCategory
  collectionNameRef.current = collectionName

  useEffect(() => {
    setTitle(group.title || '')
    setDescription(group.description || '')
    setTerrainCategory(group.terrainCategory || '')
    setCollectionName(group.collectionName || '')
    setDirty(false)
  }, [group.id, group.title, group.description, group.terrainCategory, group.collectionName])

  const save = useCallback(() => {
    onUpdateGroup({
      ...group,
      title: titleRef.current,
      description: descRef.current,
      terrainCategory: terrainCategoryRef.current,
      collectionName: collectionNameRef.current,
    })
    setDirty(false)
  }, [group, onUpdateGroup])

  const schedule = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 400)
    setDirty(true)
  }, [save])

  useEffect(() => {
    return () => clearTimeout(timer.current)
  }, [])

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    schedule()
  }

  const handleDescChange = (e) => {
    setDescription(e.target.value)
    schedule()
  }

  const handleTerrainCategoryChange = (e) => {
    setTerrainCategory(e.target.value)
    schedule()
  }

  const handleCollectionNameChange = (e) => {
    setCollectionName(e.target.value)
    schedule()
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
        <div className="field-group">
          <label htmlFor="group-terrain">Terrain Category</label>
          <select id="group-terrain" value={terrainCategory} onChange={handleTerrainCategoryChange}>
            <option value="">—</option>
            {terrainCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="group-collection">Collection Name</label>
          <input id="group-collection" type="text" value={collectionName} onChange={handleCollectionNameChange} placeholder="e.g. starter_house, ruins_a..." />
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
