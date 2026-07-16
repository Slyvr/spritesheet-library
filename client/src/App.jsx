import { useState, useEffect, useCallback } from 'react'
import SpriteSheetViewer from './components/SpriteSheetViewer'
import SpriteInfoPanel from './components/SpriteInfoPanel'
import SpriteCollectionsView from './components/SpriteCollectionsView'
import SettingsPanel from './components/SettingsPanel'
import './App.css'

const SPRITESHEETS = [
  { name: 'base_out_atlas.png', label: 'Base Out Atlas' },
  { name: 'terrain_atlas.png', label: 'Terrain Atlas' },
]

// Group IDs use timestamp + random for universal browser compatibility

export default function App() {
  const [activeSheet, setActiveSheet] = useState(SPRITESHEETS[0])
  const [spriteData, setSpriteData] = useState(null)
  const [selectedSprite, setSelectedSprite] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [selectedCol, setSelectedCol] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [mode, setMode] = useState('sprite') // 'sprite' | 'group'
  const [view, setView] = useState('spritesheet') // 'spritesheet' | 'collections'
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState({ terrainCategories: [], collectionNames: [] })

  const loadSpriteData = useCallback(async (sheet) => {
    setLoading(true)
    setSelectedSprite(null)
    setSelectedRow(null)
    setSelectedCol(null)
    setSelectedGroupId(null)
    try {
      const res = await fetch(`/api/sprite-data/${sheet.name}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      if (!data.groups) data.groups = []
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

  // Load settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.terrainCategories || data.collectionNames) {
          setSettings(data)
        }
      })
      .catch(err => console.error('Error loading settings:', err))
  }, [])

  const handleSelectSprite = (row, col) => {
    if (mode === 'group') {
      const group = spriteData?.groups?.find(g =>
        g.cells.some(c => c.row === row && c.col === col)
      )
      if (group) {
        setSelectedGroupId(group.id)
        setSelectedSprite(null)
        setSelectedRow(row)
        setSelectedCol(col)
      }
      return
    }
    setSelectedGroupId(null)
    setSelectedRow(row)
    setSelectedCol(col)
    if (spriteData) {
      const sprite = spriteData.sprites.find(s => s.row === row && s.col === col)
      setSelectedSprite(sprite || { row, col, x: col * 32, y: row * 32, title: '', description: '' })
    }
  }

  const handleUpdateSprite = async (updatedSprite) => {
    setSelectedSprite(updatedSprite)
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

  // ── Group operations ──

  const syncGroups = useCallback(async (groups) => {
    try {
      await fetch(`/api/groups/${activeSheet.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      })
    } catch (err) {
      console.error('Group save failed:', err)
    }
  }, [activeSheet.name])

  const handleCreateGroup = (cells) => {
    if (!cells || cells.length < 2) return
    const newGroup = {
      id: `g${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      cells: cells.map(({ row, col }) => ({ row, col })),
      title: '',
      description: '',
    }
    setSpriteData(prev => {
      if (!prev) return prev
      const groups = [...(prev.groups || []), newGroup]
      syncGroups(groups)
      return { ...prev, groups }
    })
    setSelectedGroupId(newGroup.id)
    setSelectedSprite(null)
  }

  const handleUpdateGroup = (updatedGroup) => {
    setSpriteData(prev => {
      if (!prev) return prev
      const groups = (prev.groups || []).map(g =>
        g.id === updatedGroup.id ? updatedGroup : g
      )
      syncGroups(groups)
      return { ...prev, groups }
    })
  }

  const handleDeleteGroup = (groupId) => {
    setSpriteData(prev => {
      if (!prev) return prev
      const groups = (prev.groups || []).filter(g => g.id !== groupId)
      syncGroups(groups)
      return { ...prev, groups }
    })
    setSelectedGroupId(null)
    setSelectedSprite(null)
  }

  const handleSaveSettings = async (next) => {
    setSettings(next)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch (err) {
      console.error('Settings save failed:', err)
    }
  }

  const selectedGroup = selectedGroupId
    ? spriteData?.groups?.find(g => g.id === selectedGroupId) || null
    : null

  const switchToSpritesheet = (sheet) => {
    setActiveSheet(sheet)
    setView('spritesheet')
  }

  const switchToCollections = () => {
    setSelectedGroupId(null)
    setSelectedSprite(null)
    setView('collections')
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
          <span /><span /><span />
        </button>
        <h1>Spritesheet Library</h1>
        <nav className="sheet-tabs">
          {SPRITESHEETS.map(sheet => (
            <button
              key={sheet.name}
              className={`sheet-tab ${activeSheet.name === sheet.name && view === 'spritesheet' ? 'active' : ''}`}
              onClick={() => switchToSpritesheet(sheet)}
            >
              {sheet.label}
            </button>
          ))}
          <div className="tab-divider" />
          <button
            className={`sheet-tab collections-tab ${view === 'collections' ? 'active' : ''}`}
            onClick={switchToCollections}
          >
            Sprite Collections
          </button>
        </nav>
      </header>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-content">
          <button className="sidebar-btn" onClick={() => { setSettingsOpen(true); setSidebarOpen(false) }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.5 2.5l1.5 1.5M12 12l1.5 1.5M2.5 13.5l1.5-1.5M12 4l1.5-1.5" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {view === 'collections' ? (
        <main className="app-main">
          {loading ? (
            <div className="loading">Loading sprite data...</div>
          ) : spriteData ? (
            <SpriteCollectionsView
              spriteData={spriteData}
              spritesheetName={activeSheet.name}
              onUpdateSprite={handleUpdateSprite}
            />
          ) : (
            <div className="loading">Failed to load sprite data</div>
          )}
        </main>
      ) : (
        <main className="app-main">
          <div className="viewer-panel">
            {loading ? (
              <div className="loading">Loading spritesheet data...</div>
            ) : spriteData ? (
              <SpriteSheetViewer
                spritesheetUrl={`/spritesheets/${activeSheet.name}`}
                spriteData={spriteData}
                mode={mode}
                selectedRow={selectedRow}
                selectedCol={selectedCol}
                selectedGroupId={selectedGroupId}
                onSelectSprite={handleSelectSprite}
                onCreateGroup={handleCreateGroup}
              />
            ) : (
              <div className="loading">Failed to load sprite data</div>
            )}
          </div>
          <div className="mode-strip">
            <button
              className={`mode-btn-sm ${mode === 'sprite' ? 'active' : ''}`}
              onClick={() => { setMode('sprite'); setSelectedGroupId(null) }}
            >Sprite</button>
            <button
              className={`mode-btn-sm ${mode === 'group' ? 'active' : ''}`}
              onClick={() => { setMode('group'); setSelectedSprite(null) }}
            >Group</button>
          </div>
          <aside className="info-panel">
            {mode === 'group' && selectedGroup ? (
              <SpriteInfoPanel
                key={`group-${selectedGroup.id}`}
                group={selectedGroup}
                spritesheetName={activeSheet.name}
                terrainCategories={settings.terrainCategories}
                collectionNames={settings.collectionNames}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            ) : !selectedGroupId && selectedSprite ? (
              <SpriteInfoPanel
                key={`sprite-${selectedSprite.row}-${selectedSprite.col}`}
                sprite={selectedSprite}
                spritesheetName={activeSheet.name}
                terrainCategories={settings.terrainCategories}
                collectionNames={settings.collectionNames}
                onUpdate={handleUpdateSprite}
              />
            ) : (
              <div className="no-selection">
                {mode === 'group' ? (
                  <p>Drag across multiple sprites to create a group, then click on a grouped cell to edit.</p>
                ) : (
                  <p>Click on a sprite in the grid to edit its title and description.</p>
                )}
              </div>
            )}
          </aside>
        </main>
      )}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  )
}
