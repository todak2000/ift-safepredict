import React from 'react'

const FIELDS = [
  { key: 'P',     label: 'Pressure',             unit: 'MPa',     min: 0.1,  max: 60,   step: 0.5 },
  { key: 'T',     label: 'Temperature',           unit: 'K',       min: 273,  max: 500,  step: 1   },
  { key: 'drho',  label: 'Density diff (Δρ)',     unit: 'g/cm³',   min: 0.001, max: 1.1, step: 0.001 },
  { key: 'MCM',   label: 'Monovalent Cation Mol.', unit: 'mol/kg', min: 0,    max: 6,    step: 0.05 },
  { key: 'BCM',   label: 'Bivalent Cation Mol.',  unit: 'mol/kg',  min: 0,    max: 2,    step: 0.01 },
  { key: 'x_CH4', label: 'CH₄ mole fraction',     unit: 'mol/mol', min: 0,    max: 0.35, step: 0.005 },
  { key: 'x_N2',  label: 'N₂ mole fraction',      unit: 'mol/mol', min: 0,    max: 0.25, step: 0.005 },
]

export default function PrimaryInputs({ values, onChange }) {
  const handleChange = (key, val) => {
    onChange({ ...values, [key]: parseFloat(val) || 0 })
  }

  return (
    <div>
      {FIELDS.map(f => (
        <div key={f.key} className="field-group">
          <div className="field-label">
            <span>{f.label}</span>
            <span className="unit">{f.unit}</span>
          </div>
          <div className="field-row">
            <input
              type="number"
              value={values[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={e => handleChange(f.key, e.target.value)}
            />
            <input
              type="range"
              value={values[f.key]}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={e => handleChange(f.key, e.target.value)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
