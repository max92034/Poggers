import { useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { ITEM_CATALOG } from '../items/catalog'
import { Wrench } from 'lucide-react'
import './DevMenu.css'

export function DevMenu() {
  const [open, setOpen] = useState(false)
  const playerItems = useGameStore((s) => s.playerItems)
  const equipItem = useGameStore((s) => s.equipItem)
  const unequipItem = useGameStore((s) => s.unequipItem)
  const clearItems = useGameStore((s) => s.clearItems)

  const equippedIds = new Set(playerItems.map((i) => i.id))

  return (
    <>
      <button className="dev-menu-btn" onClick={() => setOpen((v) => !v)} title="Dev Menu">
        <Wrench size={18} />
      </button>

      {open && (
        <div className="dev-panel">
          <div className="dev-panel-title">
            <span>Slammer Items (Dev)</span>
          </div>

          {ITEM_CATALOG.map((item) => {
            const checked = equippedIds.has(item.id)
            return (
              <label key={item.id} className="dev-item-row">
                <input
                  type="checkbox"
                  className="dev-item-check"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) equipItem(item.id)
                    else unequipItem(item.id)
                  }}
                />
                <div className="dev-item-info">
                  <span className="dev-item-name">{item.name}</span>
                  <span className="dev-item-desc">{item.description}</span>
                </div>
              </label>
            )
          })}

          <button className="dev-clear-btn" onClick={() => clearItems()}>
            Clear All Items
          </button>
        </div>
      )}
    </>
  )
}
