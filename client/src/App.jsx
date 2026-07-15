import { useState, useEffect, useCallback } from 'react'
import SpriteSheetViewer from './components/SpriteSheetViewer'
import SpriteInfoPanel from './components/SpriteInfoPanel'
import './App.css'

const SPRITESHEETS = [
  { name: 'base_out_atlas.png', label: 'Base Out Atlas' },
  { name: 'terrain_atlas.png', label: 'Terrain Atlas' },
]

export default function App() {
  const [activeSheet, setActiveSheet] = useState(SPRITESHEETS[0])
  const [spriteData, setSpriteData] = useState(null)
  const [selectedSprite, setSelectedSprite] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [selectedCol, setSelectedCol] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSpriteData = useCallback(async (sheet) => {
    setLoading(true)
    setSelectedSprite(null)
    setSelectedRow(null)
    setSelectedCol(null)
    try {
      const res = await fetch(`/api/sprite-data/${sheet.name}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setSpriteData(data)
    } catch (err) {
      console.error('Error loading sprite data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSpriteData(activeSheet)
  }, [activeSheet, loadSpriteData])

  const handleSelectSprite = (row, col) => {
    setSelectedRow(row)
    setSelectedCol(col)
    if (spriteData) {
      const sprite = spriteData.sprites.find(s => s.row === row && s.col === col)
      setSelectedSprite(sprite || { row, col, x: col * 32, y: row * 32, title: '', description: '' })
    }
  }

  const handleUpdateSprite = async (updatedSprite) => {
    setSelectedSprite(updatedSprite)

    // Optimistically update the full sprite data
    setSpriteData(prev => {
      if (!prev) return prev
      const sprites = [...prev.sprites]
      const idx = sprites.findIndex(s => s.row === updatedSprite.row && s.col === updatedSprite.col)
      if (idx >= 0) {
        sprites[idx] = updatedSprite
      } else {
        sprites.push(updatedSprite)
      }
      return { ...prev, sprites }
    })

    // Auto-save to backend
    try {
      await fetch(`/api/sprite-data/${activeSheet.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSprite),
      })
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sprite Sheet Tool</h1>
        <nav className="sheet-tabs">
          {SPRITESHEETS.map(sheet => (
            <button
              key={sheet.name}
              className={`sheet-tab ${activeSheet.name === sheet.name ? 'active' : ''}`}
              onClick={() => setActiveSheet(sheet)}
            >
              {sheet.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <div className="viewer-panel">
          {loading ? (
            <div className="loading">Loading spritesheet data...</div>
          ) : spriteData ? (
            <SpriteSheetViewer
              spritesheetUrl={`/spritesheets/${activeSheet.name}`}
              spriteData={spriteData}
              selectedRow={selectedRow}
              selectedCol={selectedCol}
              onSelectSprite={handleSelectSprite}
            />
          ) : (
            <div className="loading">Failed to load sprite data</div>
          )}
        </div>

        <aside className="info-panel">
          {selectedSprite ? (
            <SpriteInfoPanel
              sprite={selectedSprite}
              spritesheetName={activeSheet.name}
              onUpdate={handleUpdateSprite}
            />
          ) : (
            <div className="no-selection">
              <p>Click on a sprite in the grid to edit its title and description.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
