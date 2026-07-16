import { useState, useEffect, useRef } from 'react'
import './SheetSettings.css'

const TABS = [
  { key: 'terrainCategories', label: 'Terrain Category' },
  { key: 'collectionNames', label: 'Collection Name' },
]

export default function SheetSettings({ terrainCategories, collectionNames, onSave }) {
  const [local, setLocal] = useState(() => ({
    terrainCategories: [...(terrainCategories || [])],
    collectionNames: [...(collectionNames || [])],
  }))
  const [activeTab, setActiveTab] = useState('terrainCategories')
  const [inputVal, setInputVal] = useState('')
  const [dirty, setDirty] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    setLocal({
      terrainCategories: [...(terrainCategories || [])],
      collectionNames: [...(collectionNames || [])],
    })
  }, [terrainCategories, collectionNames])

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
    <div className="sheet-settings">
      <h2 className="sheet-settings-title">Data Groups</h2>

      <div className="sheet-settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`sheet-settings-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="sheet-settings-content">
        <div className="ss-add-row">
          <input
            className="ss-add-input"
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Add ${TABS.find(t => t.key === activeTab)?.label.toLowerCase()}...`}
          />
          <button className="ss-add-btn" onClick={addItem}>Add</button>
        </div>

        <div className="ss-list">
          {local[activeTab].length === 0 ? (
            <div className="ss-empty">No items yet. Add one above.</div>
          ) : (
            local[activeTab].map(item => (
              <div key={item} className="ss-list-item">
                <span className="ss-item-label">{item}</span>
                <button className="ss-item-delete" onClick={() => deleteItem(item)}>
                  &times;
                </button>
              </div>
            ))
          )}
        </div>

        {dirty && <div className="ss-saving">Saving...</div>}
      </div>
    </div>
  )
}
