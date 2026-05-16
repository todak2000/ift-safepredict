import React from 'react'

const BRINE_OPTIONS = [
  { value: 'NaCl',        label: 'NaCl' },
  { value: 'CaCl2',       label: 'CaCl₂' },
  { value: 'MgCl2',       label: 'MgCl₂' },
  { value: 'Na2SO4',      label: 'Na₂SO₄' },
  { value: 'NaCl+CaCl2', label: 'NaCl + CaCl₂' },
  { value: 'NaCl+KCl',   label: 'NaCl + KCl' },
  { value: 'Water',       label: 'Water (pure)' },
]

export default function BrineSelector({ value, onChange }) {
  return (
    <div className="field-group">
      <div className="field-label">
        <span>Brine type</span>
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {BRINE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {value === 'Na2SO4' && (
        <p className="text-muted mt-1">
          Na₂SO₄ activates YELLOW QA — +11% apparatus bias known from Li et al. (2012).
        </p>
      )}
    </div>
  )
}
