import { useState, useMemo } from 'react'
import './SpriteCollectionsView.css'

const DOT_POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']
const DOT_LABELS = {
  tl: 'top-left', tc: 'top-center', tr: 'top-right',
  ml: 'mid-left', mr: 'mid-right',
  bl: 'bot-left', bc: 'bot-center', br: 'bot-right',
}

export default function CollectionView({ spriteData, spritesheetName, collectionNames, onUpdateSprite, onSelectSprite }) {
  const [selectedCollection, setSelectedCollection] = useState(null)

  const collectionMap = useMemo(() => {
    const map = {}
    for (const name of collectionNames) {
      const count = (spriteData?.sprites || []).filter(s => s.collectionName === name).length
      if (count > 0) map[name] = count
    }
    return map
  }, [collectionNames, spriteData])

  const filteredSprites = useMemo(() => {
    if (!selectedCollection || !spriteData) return []
    return spriteData.sprites.filter(s => s.collectionName === selectedCollection)
  }, [selectedCollection, spriteData])

  const names = Object.keys(collectionMap)

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
      <div className="category-list-panel">
        <h2 className="panel-heading">Collections</h2>
        <div className="category-list">
          {names.length === 0 ? (
            <div className="no-categories-msg">
              No collection names have been assigned yet. Set a Collection Name on sprites in the spritesheet view.
            </div>
          ) : (
            names.map(name => (
              <div
                key={name}
                className={`category-list-item ${name === selectedCollection ? 'selected' : ''}`}
                onClick={() => setSelectedCollection(name === selectedCollection ? null : name)}
              >
                <div className="category-item-title">{name}</div>
                <div className="category-item-meta">{collectionMap[name]} sprite{collectionMap[name] !== 1 ? 's' : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sprite-grid-panel">
        {selectedCollection ? (
          <>
            <h2 className="panel-heading">
              {selectedCollection}
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
                  onClick={() => onSelectSprite(sprite)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-category-selected">
            <p>Select a collection from the list to view all sprites assigned to it.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SpriteCell({ cell, spritesheetName, onToggleDot, dotState, onClick }) {
  const SPRITE = 32
  const SCALE = 2.5
  const CELL_SIZE = SPRITE * SCALE

  return (
    <div className="sprite-cell" onClick={onClick} style={{ cursor: 'pointer' }}>
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
