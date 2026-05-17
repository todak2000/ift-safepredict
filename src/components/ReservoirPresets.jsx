import React from 'react'

const PRESETS = [
  {
    label: 'Sleipner (Utsira Fm, North Sea)',
    P: 10, T: 310, salinity: 3.5, MCM: 3.5, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Snøhvit (Tubåen Fm, Barents Sea)',
    P: 28, T: 370, salinity: 4.0, MCM: 4.0, BCM: 0, x_CH4: 0.02, x_N2: 0.01, brineType: 'NaCl',
  },
  {
    label: 'In Salah (Krechba Fm, Algeria)',
    P: 18, T: 350, salinity: 2.5, MCM: 2.5, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Quest (Alberta Basin, Canada)',
    P: 15, T: 330, salinity: 3.0, MCM: 3.0, BCM: 0, x_CH4: 0.01, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Gorgon (Barrow Island, Australia)',
    P: 22, T: 360, salinity: 3.5, MCM: 3.5, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Illinois Basin Decatur (USA)',
    P: 20, T: 320, salinity: 4.5, MCM: 4.5, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Tomakomai (Japan)',
    P: 12, T: 340, salinity: 3.0, MCM: 3.0, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Typical Saline Aquifer',
    P: 15, T: 330, salinity: 3.0, MCM: 2.0, BCM: 1.0, x_CH4: 0, x_N2: 0, brineType: 'NaCl+CaCl2',
  },
  {
    label: 'Deep Saline Aquifer',
    P: 30, T: 370, salinity: 4.0, MCM: 3.0, BCM: 1.0, x_CH4: 0.01, x_N2: 0, brineType: 'NaCl+CaCl2',
  },
  {
    label: 'Depleted Gas Reservoir',
    P: 8, T: 320, salinity: 2.0, MCM: 1.5, BCM: 0.5, x_CH4: 0.15, x_N2: 0.05, brineType: 'NaCl+CaCl2',
  },
  {
    label: 'High-Pressure Saline (Offshore)',
    P: 45, T: 390, salinity: 5.0, MCM: 4.0, BCM: 1.0, x_CH4: 0, x_N2: 0, brineType: 'NaCl',
  },
  {
    label: 'Carbonate Reservoir (Middle East)',
    P: 25, T: 380, salinity: 4.5, MCM: 3.0, BCM: 1.5, x_CH4: 0.05, x_N2: 0, brineType: 'NaCl+CaCl2',
  },
  {
    label: 'Pure Water (Lab Reference)',
    P: 10, T: 298, salinity: 0, MCM: 0, BCM: 0, x_CH4: 0, x_N2: 0, brineType: 'Water',
  },
]

export default function ReservoirPresets({ onSelect, activePreset }) {
  return (
    <div className="field-group" style={{ marginBottom: '0.85rem' }}>
      <div className="field-label">
        <span>Reservoir Preset</span>
        {activePreset && <span className="eos-tag" style={{ fontSize: '0.6rem' }}>active</span>}
      </div>
      <select
        value={activePreset || ''}
        onChange={e => {
          const preset = PRESETS.find(p => p.label === e.target.value)
          if (preset) onSelect({ ...preset, presetName: preset.label, drho: 0.40, eosEstimated: true })
          e.target.value = activePreset || ''
        }}
      >
        <option value="">Select a CCUS formation…</option>
        {PRESETS.map(p => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}
