import { useState, useEffect, useCallback, useRef } from 'react'
import SpriteSheetViewer from './components/SpriteSheetViewer'
import SpriteInfoPanel from './components/SpriteInfoPanel'
import SpriteCollectionsView from './components/SpriteCollectionsView'
import CollectionView from './components/CollectionView'
import SheetSettings from './components/SheetSettings'
import './App.css'

export default function App() {
  const [sheetsList, setSheetsList] = useState([])
  const [activeSheet, setActiveSheet] = useState(null)
  const [spriteData, setSpriteData] = useState(null)
  const [selectedSprite, setSelectedSprite] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [selectedCol, setSelectedCol] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [mode, setMode] = useState('sprite')
  const [view, setView] = useState('spritesheet')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCollectionSprite, setSelectedCollectionSprite] = useState(null)
  const fileInputRef = useRef(null)

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
    if (activeSheet) loadSpriteData(activeSheet)
  }, [activeSheet, loadSpriteData])

  // Load spritesheets list
  useEffect(() => {
    fetch('/api/spritesheets')
      .then(r => r.json())
      .then(list => {
        setSheetsList(list)
        if (list.length > 0 && !activeSheet) {
          setActiveSheet(list[0])
        }
      })
      .catch(err => console.error('Error loading spritesheets:', err))
  }, [])

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const pngFiles = []
    const jsonFiles = []
    for (const f of files) {
      if (f.name.toLowerCase().endsWith('.png')) pngFiles.push(f)
      else if (f.name.toLowerCase().endsWith('.json')) jsonFiles.push(f)
    }

    if (pngFiles.length === 0) {
      alert('Please select at least one PNG spritesheet file.')
      return
    }
    if (pngFiles.length > 1) {
      alert('Only one PNG file can be uploaded at a time.')
      return
    }
    if (jsonFiles.length > 1) {
      alert('Only one JSON file can be uploaded at a time.')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('png', pngFiles[0])
      if (jsonFiles.length === 1) fd.append('json', jsonFiles[0])

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Upload failed')
        return
      }
      // Refresh sheets list
      const list = await (await fetch('/api/spritesheets')).json()
      setSheetsList(list)
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
    if (!activeSheet) return
    try {
      await fetch(`/api/groups/${activeSheet.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups }),
      })
    } catch (err) {
      console.error('Group save failed:', err)
    }
  }, [activeSheet])

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

  const handleSaveSheetSettings = async (next) => {
    if (!activeSheet) return
    // Update spriteData in place so dropdowns reflect changes immediately
    setSpriteData(prev => prev ? { ...prev, ...next } : prev)
    try {
      await fetch(`/api/sprite-settings/${activeSheet.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch (err) {
      console.error('Sheet settings save failed:', err)
    }
  }

  const selectedGroup = selectedGroupId
    ? spriteData?.groups?.find(g => g.id === selectedGroupId) || null
    : null

  const switchToSpritesheet = (sheet) => {
    setActiveSheet(sheet)
    setView('spritesheet')
  }

  const switchToTerrain = () => {
    setSelectedGroupId(null)
    setSelectedSprite(null)
    setView('terrain')
  }

  const switchToCollectionView = () => {
    setSelectedGroupId(null)
    setSelectedSprite(null)
    setSelectedCollectionSprite(null)
    setView('collection_view')
  }

  const switchToSettings = () => {
    setView('settings')
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <span /><span /><span />
        </button>
        <h1>Spritesheet Library</h1>
      </header>

      <div className="app-body">
        <div className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-upload-area">
            <>
              <button
                className="sidebar-btn sidebar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Upload spritesheet"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1v8M5 5l4-4 4 4" />
                  <path d="M1 13v4h16v-4" />
                </svg>
                {sidebarOpen && <span>{uploading ? 'Uploading...' : 'Upload'}</span>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.json"
                multiple
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              <a
                className="sidebar-btn sidebar-dlall-btn"
                href="/api/download/all"
                download
                title="Download all spritesheets as ZIP"
              >
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1v8M3 6l4 4 4-4" />
                  <path d="M1 11v2h12v-2" />
                </svg>
                {sidebarOpen && <span>Download All</span>}
              </a>
            </>
          </div>
          <div className="sidebar-section-label">{sidebarOpen && 'Sheets'}</div>
          {sheetsList.map(sheet => {
            return (
            <div key={sheet.name} className="sidebar-sheet-row">
              <button
                className={`sidebar-btn ${activeSheet?.name === sheet.name ? 'active' : ''}`}
                onClick={() => switchToSpritesheet(sheet)}
                title={sidebarOpen ? '' : sheet.label}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="6" height="6" />
                  <rect x="10" y="2" width="6" height="6" />
                  <rect x="2" y="10" width="6" height="6" />
                  <rect x="10" y="10" width="6" height="6" />
                </svg>
                {sidebarOpen && <span className="sidebar-sheet-label">{sheet.label}</span>}
              </button>
              {sidebarOpen && (
                <div className="sidebar-dl-group">
                  <a
                    className="sidebar-dl-btn"
                    href={`/api/download/png/${sheet.name}`}
                    download
                    title="Download PNG spritesheet"
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1v8M3 6l4 4 4-4" />
                      <path d="M1 11v2h12v-2" />
                    </svg>
                  </a>
                  <a
                    className="sidebar-dl-btn"
                    href={`/api/download/json/${sheet.name}`}
                    download
                    title="Download JSON data"
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 1v12M11 1v12M3 1L11 1" />
                      <path d="M5 4h4" />
                      <path d="M5 7h4" />
                      <path d="M5 10h4" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
            );
          })}

          <div className="sidebar-spacer" />
        </div>

        <main className="app-main">
          {!activeSheet ? (
            <div className="empty-state">
              <div className="empty-state-content">
                <svg width="48" height="48" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 1v8M5 5l4-4 4 4" />
                  <path d="M1 13v4h16v-4" />
                </svg>
                <h2>No spritesheets yet</h2>
                <p>Upload a PNG spritesheet to get started.</p>
                <button className="upload-cta" onClick={() => fileInputRef.current?.click()}>
                  Upload Spritesheet
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="view-mode-tabs">
            <button
              className={`view-tab ${mode === 'sprite' && view === 'spritesheet' ? 'active' : ''}`}
              onClick={() => { setMode('sprite'); setSelectedGroupId(null); setView('spritesheet') }}
            >Sprite</button>
            <button
              className={`view-tab ${mode === 'group' && view === 'spritesheet' ? 'active' : ''}`}
              onClick={() => { setMode('group'); setSelectedSprite(null); setView('spritesheet') }}
            >Group</button>
            <button
              className={`view-tab collections-tab ${view === 'terrain' ? 'active' : ''}`}
              onClick={switchToTerrain}
            >Terrain</button>
            <button
              className={`view-tab ${view === 'collection_view' ? 'active' : ''}`}
              onClick={switchToCollectionView}
            >Collections</button>
            <button
              className={`view-tab settings-tab ${view === 'settings' ? 'active' : ''}`}
              onClick={switchToSettings}
            >Settings</button>
          </div>

          {view === 'settings' ? (
            loading ? (
              <div className="loading">Loading sprite data...</div>
            ) : spriteData ? (
              <SheetSettings
                terrainCategories={spriteData.terrainCategories || []}
                collectionNames={spriteData.collectionNames || []}
                onSave={handleSaveSheetSettings}
              />
            ) : (
              <div className="loading">Failed to load sprite data</div>
            )
          ) : view === 'terrain' ? (
            loading ? (
              <div className="loading">Loading sprite data...</div>
            ) : spriteData ? (
              <SpriteCollectionsView
                spriteData={spriteData}
                spritesheetName={activeSheet.name}
                terrainCategories={spriteData?.terrainCategories || []}
                onUpdateSprite={handleUpdateSprite}
              />
            ) : (
              <div className="loading">Failed to load sprite data</div>
            )
          ) : view === 'collection_view' ? (
            <div className="viewer-content">
              <div className="viewer-panel" style={{ padding: 0 }}>
              {loading ? (
                <div className="loading">Loading sprite data...</div>
              ) : spriteData ? (
                <CollectionView
                  spriteData={spriteData}
                  spritesheetName={activeSheet.name}
                  collectionNames={spriteData?.collectionNames || []}
                  onUpdateSprite={handleUpdateSprite}
                  onSelectSprite={(sprite) => setSelectedCollectionSprite(sprite)}
                />
              ) : (
                <div className="loading">Failed to load sprite data</div>
              )}
            </div>
            <aside className="info-panel">
              {selectedCollectionSprite ? (
                <SpriteInfoPanel
                  key={`coll-sprite-${selectedCollectionSprite.row}-${selectedCollectionSprite.col}`}
                  sprite={selectedCollectionSprite}
                  spritesheetName={activeSheet.name}
                  terrainCategories={spriteData?.terrainCategories || []}
                  collectionNames={spriteData?.collectionNames || []}
                  onUpdate={handleUpdateSprite}
                />
              ) : (
                <div className="no-selection">
                  <p>Click on a sprite to edit its title and description.</p>
                </div>
              )}
            </aside>
            </div>
          ) : (
            <div className="viewer-content">
              <div className="viewer-panel">
              {loading ? (
                <div className="loading">Loading spritesheet data...</div>
              ) : spriteData ? (
                <SpriteSheetViewer
                  spritesheetUrl={`/api/spritesheet-img/${activeSheet.name}`}
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
            <aside className="info-panel">
              {mode === 'group' && selectedGroup ? (
                <SpriteInfoPanel
                  key={`group-${selectedGroup.id}`}
                  group={selectedGroup}
                  spritesheetName={activeSheet.name}
                  terrainCategories={spriteData?.terrainCategories || []}
                  collectionNames={spriteData?.collectionNames || []}
                  onUpdateGroup={handleUpdateGroup}
                  onDeleteGroup={handleDeleteGroup}
                />
              ) : !selectedGroupId && selectedSprite ? (
                <SpriteInfoPanel
                  key={`sprite-${selectedSprite.row}-${selectedSprite.col}`}
                  sprite={selectedSprite}
                  spritesheetName={activeSheet.name}
                  terrainCategories={spriteData?.terrainCategories || []}
                  collectionNames={spriteData?.collectionNames || []}
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
            </div>
          )}
          </>
          )}
        </main>
      </div>

    </div>
  )
}