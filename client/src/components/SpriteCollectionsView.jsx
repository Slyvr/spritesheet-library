import { useState, useMemo } from 'react'
import './SpriteCollectionsView.css'

const DOT_POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']
const DOT_LABELS = {
  tl: 'top-left', tc: 'top-center', tr: 'top-right',
  ml: 'mid-left', mr: 'mid-right',
  bl: 'bot-left', bc: 'bot-center', br: 'bot-right',
}

export default function TerrainCollectionsView({ spriteData, spritesheetName, terrainCategories, onUpdateSprite }) {
  const [selectedCategory, setSelectedCategory] = useState(null)

  const groups = spriteData?.groups || []

  // Count sprites and groups per terrain category
  const categoryMap = useMemo(() => {
    const map = {}
    for (const cat of terrainCategories) {
      const spriteCount = (spriteData?.sprites || []).filter(s => s.terrainCategory === cat).length
      const groupCount = groups.filter(g => g.terrainCategory === cat).length
      if (spriteCount > 0 || groupCount > 0) {
        map[cat] = { spriteCount, groupCount }
      }
    }
    return map
  }, [terrainCategories, spriteData, groups])

  // Filtered results
  const filteredSprites = useMemo(() => {
    if (!selectedCategory || !spriteData) return []
    return spriteData.sprites.filter(s => s.terrainCategory === selectedCategory)
  }, [selectedCategory, spriteData])

  const filteredGroups = useMemo(() => {
    if (!selectedCategory) return []
    return groups.filter(g => g.terrainCategory === selectedCategory)
  }, [selectedCategory, groups])

  const categories = Object.keys(categoryMap)

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
        <h2 className="panel-heading">Terrain Categories</h2>
        <div className="category-list">
          {categories.length === 0 ? (
            <div className="no-categories-msg">
              No terrain categories have been assigned yet. Set a Terrain Category on sprites or groups in the spritesheet view.
            </div>
          ) : (
            categories.map(cat => (
              <div
                key={cat}
                className={`category-list-item ${cat === selectedCategory ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                <div className="category-item-title">{cat}</div>
                <div className="category-item-meta">
                  {categoryMap[cat].spriteCount} sprite{categoryMap[cat].spriteCount !== 1 ? 's' : ''}
                  {categoryMap[cat].groupCount > 0 && ` · ${categoryMap[cat].groupCount} group${categoryMap[cat].groupCount !== 1 ? 's' : ''}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sprite-grid-panel">
        {selectedCategory ? (
          <>
            <h2 className="panel-heading">
              {selectedCategory}
              <span className="grid-subtitle">
                {filteredSprites.length} sprite{filteredSprites.length !== 1 ? 's' : ''}
                {filteredGroups.length > 0 && ` · ${filteredGroups.length} group${filteredGroups.length !== 1 ? 's' : ''}`}
              </span>
            </h2>
            <div className="sprite-grid">
              {filteredGroups.map(group => (
                <GroupCard key={group.id} group={group} spritesheetName={spritesheetName} />
              ))}
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
          <div className="no-category-selected">
            <p>Select a terrain category from the list to view all sprites and groups assigned to it.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SpriteCell({ cell, spritesheetName, onToggleDot, dotState }) {
  const SPRITE = 32
  const SCALE = 2.5
  const CELL_SIZE = SPRITE * SCALE

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

function GroupCard({ group, spritesheetName }) {
  const cellCount = group.cells?.length || 0
  const title = group.title || '(untitled)'
  // Show first cell as preview
  const first = group.cells?.[0]
  const SPRITE = 32
  const SCALE = 2.5
  const CELL_SIZE = SPRITE * SCALE

  return (
    <div className="group-card">
      <div className="group-card-preview">
        {first ? (
          <div className="sprite-image" style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundImage: `url(/spritesheets/${spritesheetName})`,
            backgroundPosition: `-${first.col * CELL_SIZE}px -${first.row * CELL_SIZE}px`,
            backgroundSize: `${32 * CELL_SIZE}px ${32 * CELL_SIZE}px`,
            imageRendering: 'pixelated',
          }} />
        ) : (
          <div className="sprite-image" style={{ width: CELL_SIZE, height: CELL_SIZE, background: '#0d0d1f' }} />
        )}
      </div>
      <div className="group-card-info">
        <div className="group-card-title">{title}</div>
        <div className="group-card-meta">{cellCount} cells</div>
      </div>
      <div className="group-card-badge">GROUP</div>
    </div>
  )
}
