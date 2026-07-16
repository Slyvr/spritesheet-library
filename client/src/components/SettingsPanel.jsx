import { useState, useEffect, useRef } from 'react'
import './SettingsPanel.css'

const TABS = [
  { key: 'terrainCategories', label: 'Terrain Category' },
  { key: 'collectionNames', label: 'Collection Name' },
]

export default function SettingsPanel({ settings, onSave, onClose }) {
  const [local, setLocal] = useState(() => ({
    terrainCategories: [...(settings.terrainCategories || [])],
    collectionNames: [...(settings.collectionNames || [])],
  }))
  const [activeTab, setActiveTab] = useState('terrainCategories')
  const [inputVal, setInputVal] = useState('')
  const [dirty, setDirty] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    setLocal({
      terrainCategories: [...(settings.terrainCategories || [])],
      collectionNames: [...(settings.collectionNames || [])],
    })
  }, [settings])

  const scheduleSave = (next) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSave(next)
      setDirty(false)
    }, 400)
    setDirty(true)
  }

  const addItem = () => {
    const val = inputVal.trim()
    if (!val) return
    const list = local[activeTab]
    if (list.includes(val)) return
    const next = { ...local, [activeTab]: [...list, val] }
    setLocal(next)
    setInputVal('')
    scheduleSave(next)
  }

  const deleteItem = (item) => {
    const list = local[activeTab]
    const next = { ...local, [activeTab]: list.filter(v => v !== item) }
    setLocal(next)
    scheduleSave(next)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Data Groups</h3>

          <div className="settings-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-tab-content">
            <div className="settings-add-row">
              <input
                className="settings-add-input"
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Add ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
              />
              <button className="settings-add-btn" onClick={addItem}>Add</button>
            </div>

            <div className="settings-list">
              {local[activeTab].length === 0 ? (
                <div className="settings-empty">No items yet. Add one above.</div>
              ) : (
                local[activeTab].map(item => (
                  <div key={item} className="settings-list-item">
                    <span className="settings-item-label">{item}</span>
                    <button className="settings-item-delete" onClick={() => deleteItem(item)}>
                      &times;
                    </button>
                  </div>
                ))
              )}
            </div>

            {dirty && <div className="settings-saving">Saving...</div>}
          </div>
        </div>
      </div>
    </div>
  )
}