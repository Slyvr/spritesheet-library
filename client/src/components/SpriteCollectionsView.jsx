import { useState, useMemo } from 'react'
import './SpriteCollectionsView.css'

const DOT_POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']
const DOT_LABELS = {
  tl: 'top-left', tc: 'top-center', tr: 'top-right',
  ml: 'mid-left', mr: 'mid-right',
  bl: 'bot-left', bc: 'bot-center', br: 'bot-right',
}

export default function SpriteCollectionsView({ spriteData, spritesheetName, onUpdateSprite }) {
  const [selectedTag, setSelectedTag] = useState(null)

  // Collect unique tags from all sprites, sorted
  const tagMap = useMemo(() => {
    const map = {}
    for (const s of spriteData?.sprites || []) {
      for (const t of s.tags || []) {
        map[t] = (map[t] || 0) + 1
      }
    }
    return Object.fromEntries(Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])))
  }, [spriteData])

  // Sprites that have the selected tag
  const filteredSprites = useMemo(() => {
    if (!selectedTag || !spriteData) return []
    return spriteData.sprites.filter(s => (s.tags || []).includes(selectedTag))
  }, [selectedTag, spriteData])

  const tags = Object.keys(tagMap)

  const toggleConstraint = (sprite, dotPos) => {
    const constraints = sprite.constraints ? [...sprite.constraints] : []
    const idx = constraints.indexOf(dotPos)
    if (idx >= 0) {
      constraints.splice(idx, 1)
    } else {
      constraints.push(dotPos)
    }
    onUpdateSprite({
      ...sprite,
      constraints: constraints.length ? constraints : undefined,
    })
  }

  return (
    <div className="collections-view">
      <div className="tag-list-panel">
        <h2 className="panel-heading">Tags</h2>
        <div className="tag-list">
          {tags.length === 0 ? (
            <div className="no-tags-msg">
              No tags yet. Add tags to sprites in the spritesheet view.
            </div>
          ) : (
            tags.map(tag => (
              <div
                key={tag}
                className={`tag-list-item ${tag === selectedTag ? 'selected' : ''}`}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              >
                <div className="tag-item-title">{tag}</div>
                <div className="tag-item-meta">{tagMap[tag]} sprite{tagMap[tag] !== 1 ? 's' : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sprite-grid-panel">
        {selectedTag ? (
          <>
            <h2 className="panel-heading">
              {selectedTag}
              <span className="grid-subtitle">{filteredSprites.length} sprite{filteredSprites.length !== 1 ? 's' : ''}</span>
            </h2>
            <div className="sprite-grid">
              {filteredSprites.map(sprite => (
                <SpriteCell
                  key={`${sprite.row}-${sprite.col}`}
                  cell={sprite}
                  spritesheetName={spritesheetName}
                  onToggleDot={(pos) => toggleConstraint(sprite, pos)}
                  dotState={DOT_POSITIONS.reduce((acc, p) => {
                    acc[p] = (sprite.constraints || []).includes(p)
                    return acc
                  }, {})}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-tag-selected">
            <p>Select a tag from the list to view all sprites with that tag and configure edge constraints.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SpriteCell({ cell, spritesheetName, onToggleDot, dotState }) {
  const SPRITE = 32
  const SCALE = 2.5
  const CELL_SIZE = SPRITE * SCALE // 80px

  return (
    <div className="sprite-cell">
      <div className="sprite-image" style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundImage: `url(/spritesheets/${spritesheetName})`,
        backgroundPosition: `-${cell.col * CELL_SIZE}px -${cell.row * CELL_SIZE}px`,
        backgroundSize: `${32 * CELL_SIZE}px ${32 * CELL_SIZE}px`,
        imageRendering: 'pixelated',
      }}>
        <div className="dot-overlay">
          {DOT_POSITIONS.map(pos => (
            <div
              key={pos}
              className={`dot ${pos} ${dotState[pos] ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleDot(pos) }}
              title={DOT_LABELS[pos]}
            />
          ))}
        </div>
      </div>
      <div className="sprite-cell-label">
        {cell.row},{cell.col}
      </div>
    </div>
  )
}
