import { useState, useMemo } from 'react'
import './SpriteCollectionsView.css'

const DOT_POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br']

const DOT_LABELS = {
  tl: 'top-left', tc: 'top-center', tr: 'top-right',
  ml: 'mid-left', mr: 'mid-right',
  bl: 'bot-left', bc: 'bot-center', br: 'bot-right',
}

export default function SpriteCollectionsView({ spriteData, spritesheetName, onUpdateGroup }) {
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  const groups = useMemo(() => {
    return [...(spriteData?.groups || [])].sort((a, b) => {
      const ta = (a.title || '').toLowerCase()
      const tb = (b.title || '').toLowerCase()
      return ta.localeCompare(tb)
    })
  }, [spriteData])

  const selectedGroup = groups.find(g => g.id === selectedGroupId) || null

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId === selectedGroupId ? null : groupId)
  }

  const toggleConstraint = (cellRow, cellCol, dotPos) => {
    if (!selectedGroup) return
    const cells = selectedGroup.cells.map(c => {
      if (c.row !== cellRow || c.col !== cellCol) return c
      const constraints = c.constraints ? [...c.constraints] : []
      const idx = constraints.indexOf(dotPos)
      if (idx >= 0) {
        constraints.splice(idx, 1)
      } else {
        constraints.push(dotPos)
      }
      return { ...c, constraints: constraints.length ? constraints : undefined }
    })
    onUpdateGroup({ ...selectedGroup, cells })
  }

  const hasConstraint = (cell, dotPos) => {
    return cell.constraints?.includes(dotPos) || false
  }

  return (
    <div className="collections-view">
      <div className="group-list-panel">
        <h2 className="panel-heading">Groups</h2>
        <div className="group-list">
          {groups.length === 0 ? (
            <div className="no-groups-msg">
              No groups yet. Switch to Group mode on a spritesheet tab to create groups.
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g.id}
                className={`group-list-item ${g.id === selectedGroupId ? 'selected' : ''}`}
                onClick={() => handleSelectGroup(g.id)}
              >
                <div className="group-item-title">{g.title || '(untitled)'}</div>
                <div className="group-item-meta">
                  {g.cells.length} sprite{g.cells.length !== 1 ? 's' : ''}
                  {g.cells.some(c => c.constraints?.length) && ' · constrained'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sprite-grid-panel">
        {selectedGroup ? (
          <>
            <h2 className="panel-heading">
              {selectedGroup.title || '(untitled group)'}
              <span className="grid-subtitle">{selectedGroup.cells.length} sprites</span>
            </h2>
            <div className="sprite-grid">
              {selectedGroup.cells.map(cell => (
                <SpriteCell
                  key={`${cell.row}-${cell.col}`}
                  cell={cell}
                  spritesheetName={spritesheetName}
                  onToggleDot={(pos) => toggleConstraint(cell.row, cell.col, pos)}
                  dotState={DOT_POSITIONS.reduce((acc, p) => {
                    acc[p] = hasConstraint(cell, p)
                    return acc
                  }, {})}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-group-selected">
            <p>Select a group from the list to view its sprites and configure constraints.</p>
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
        backgroundSize: `${32 * CELL_SIZE / 32}px ${32 * CELL_SIZE / 32}px`,
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
