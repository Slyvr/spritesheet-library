import { useState, useMemo, useRef, useEffect } from 'react'
import './SpriteCollectionsView.css'

const DOT_POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']
const DOT_LABELS = {
  tl: 'top-left', tc: 'top-center', tr: 'top-right',
  ml: 'mid-left', mr: 'mid-right',
  bl: 'bot-left', bc: 'bot-center', br: 'bot-right',
}

export default function TerrainCollectionsView({ spriteData, spritesheetName, terrainCategories, onUpdateSprite }) {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [expandedGroupId, setExpandedGroupId] = useState(null)

  const groups = spriteData?.groups || []

  // Count sprites and groups per terrain category.
  // Discovers categories from the master list, plus any set on sprites/groups.
  const categoryMap = useMemo(() => {
    const map = {}
    const allCats = new Set(terrainCategories)
    for (const s of spriteData?.sprites || []) {
      if (s.terrainCategory) allCats.add(s.terrainCategory)
    }
    for (const g of groups) {
      if (g.terrainCategory) allCats.add(g.terrainCategory)
    }
    for (const cat of allCats) {
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

  const setSpriteConstraints = (sprite, constraints) => {
    onUpdateSprite({
      ...sprite,
      constraints: constraints.length > 0 ? constraints : null,
    })
  }

  const resetSpriteConstraints = (sprite) => {
    onUpdateSprite({
      ...sprite,
      constraints: null,
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
                <GroupCard
                  key={group.id}
                  group={group}
                  spritesheetName={spritesheetName}
                  spriteData={spriteData}
                  expanded={expandedGroupId === group.id}
                  onToggle={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
                  onToggleDot={(sprite, dotPos) => toggleConstraint(sprite, dotPos)}
                  onSetConstraints={(sprite, constraints) => setSpriteConstraints(sprite, constraints)}
                  onResetSprite={(sprite) => resetSpriteConstraints(sprite)}
                />
              ))}
              {filteredSprites.map(sprite => (
                <SpriteCell
                  key={`${sprite.row}-${sprite.col}`}
                  cell={sprite}
                  spritesheetName={spritesheetName}
                  onSetConstraints={(constraints) => setSpriteConstraints(sprite, constraints)}
                  onReset={() => resetSpriteConstraints(sprite)}
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

function SpriteCell({ cell, spritesheetName, onSetConstraints, onReset, dotState }) {
  const SPRITE = 32
  const SCALE = 4
  const CELL_SIZE = SPRITE * SCALE

  const dragRef = useRef(null)
  // Keep a mutable ref of the latest constraints so zone enter handlers aren't stale
  const activeRef = useRef(new Set())
  activeRef.current = new Set(Object.entries(dotState).filter(([,v]) => v).map(([k]) => k))

  useEffect(() => {
    const up = () => { dragRef.current = null }
    document.addEventListener('mouseup', up)
    return () => document.removeEventListener('mouseup', up)
  }, [])

  const zoneMouseDown = (zone) => (e) => {
    e.preventDefault()
    const currentlyActive = activeRef.current.has(zone)
    const next = new Set(activeRef.current)
    if (currentlyActive) {
      next.delete(zone)
      dragRef.current = { action: 'remove', touched: new Set([zone]) }
    } else {
      next.add(zone)
      dragRef.current = { action: 'add', touched: new Set([zone]) }
    }
    onSetConstraints([...next])
  }

  const zoneMouseEnter = (zone) => () => {
    const drag = dragRef.current
    if (!drag || drag.touched.has(zone)) return
    drag.touched.add(zone)
    const next = new Set(activeRef.current)
    if (drag.action === 'add') {
      next.add(zone)
    } else {
      next.delete(zone)
    }
    onSetConstraints([...next])
  }

  return (
    <div className="sprite-cell">
      <div className="sprite-image" style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundImage: `url(/api/spritesheet-img/${spritesheetName})`,
        backgroundPosition: `-${cell.col * CELL_SIZE}px -${cell.row * CELL_SIZE}px`,
        backgroundSize: `${32 * CELL_SIZE}px ${32 * CELL_SIZE}px`,
        imageRendering: 'pixelated',
      }}>
        {/* Zone grid overlay */}
        <div className="zone-grid">
          {[
            { zone: 'tl', row: 0, col: 0 },
            { zone: 'tc', row: 0, col: 1 },
            { zone: 'tr', row: 0, col: 2 },
            { zone: 'ml', row: 1, col: 0 },
            // center: row 1, col 1 — dead zone, skipped
            { zone: 'mr', row: 1, col: 2 },
            { zone: 'bl', row: 2, col: 0 },
            { zone: 'bc', row: 2, col: 1 },
            { zone: 'br', row: 2, col: 2 },
          ].map(({ zone, row, col }) => (
            <div
              key={zone}
              className={`zone ${zone} ${dotState[zone] ? 'active' : ''}`}
              style={{
                gridRow: row + 1,
                gridColumn: col + 1,
              }}
              onMouseDown={zoneMouseDown(zone)}
              onMouseEnter={zoneMouseEnter(zone)}
              title={DOT_LABELS[zone]}
            />
          ))}
        </div>

        {/* Reset X button */}
        {(cell.constraints?.length > 0) && (
          <button
            className="constraint-reset-btn"
            onClick={(e) => { e.stopPropagation(); onReset() }}
            title="Reset all constraints"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        )}
      </div>
      <div className="sprite-cell-label">{cell.row},{cell.col}</div>
    </div>
  )
}

function GroupCard({ group, spritesheetName, spriteData, expanded, onToggle, onToggleDot, onSetConstraints, onResetSprite }) {
  const cellCount = group.cells?.length || 0
  const title = group.title || '(untitled)'
  const first = group.cells?.[0]
  const SPRITE = 32
  const SCALE = 4
  const CELL_SIZE = SPRITE * SCALE

  // Look up sprite data for each cell to get current constraints
  const cellSprites = useMemo(() => {
    if (!expanded || !spriteData?.sprites) return []
    return group.cells.map(cell => {
      const s = spriteData.sprites.find(sp => sp.row === cell.row && sp.col === cell.col)
      return s || { row: cell.row, col: cell.col, constraints: [] }
    })
  }, [expanded, group.cells, spriteData])

  return (
    <div className={`group-card-wrapper ${expanded ? 'expanded' : ''}`}>
      <div className="group-card" onClick={onToggle}>
        <div className="group-card-preview">
          {first ? (
            <div className="sprite-image" style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundImage: `url(/api/spritesheet-img/${spritesheetName})`,
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
        <div className={`group-card-chevron ${expanded ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 2l4 4-4 4" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="group-card-cells">
          {cellSprites.map(cell => (
            <SpriteCell
              key={`${cell.row}-${cell.col}`}
              cell={cell}
              spritesheetName={spritesheetName}
              onSetConstraints={(constraints) => onSetConstraints(cell, constraints)}
              onReset={() => onResetSprite(cell)}
              dotState={DOT_POSITIONS.reduce((acc, p) => {
                acc[p] = (cell.constraints || []).includes(p)
                return acc
              }, {})}
            />
          ))}
        </div>
      )}
    </div>
  )
}
