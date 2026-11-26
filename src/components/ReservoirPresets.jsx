import React from 'react'
import { PRESETS } from '../logic/presetsData.js'

export { PRESETS }

export default function ReservoirPresets({ onSelect, activePreset }) {
  return (
    <div className="presets-section">
      <div className="presets-header">
        <span>Formation Geological Presets</span>
        <span>Quick Select</span>
      </div>
      <div className="preset-chip-list">
        {PRESETS.map(p => {
          const isActive = activePreset === p.label
          const shortName = p.label.includes('UAE')
            ? p.label.split(',')[0].replace(' (', ' · ')
            : p.label.split('(')[0].trim()
          return (
            <button
              key={p.label}
              type="button"
              className={`preset-chip ${isActive ? 'active' : ''}`}
              onClick={() => onSelect({ ...p, presetName: p.label })}
              title={p.label}
            >
              {shortName}
            </button>
          )
        })}
      </div>
    </div>
  )
}
