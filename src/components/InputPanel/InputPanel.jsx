import React from 'react'
import { computeDrho } from '../../logic/eosEngine.js'

const BRINE_OPTIONS = [
  { value: '',            label: 'Select brine type… (required)' },
  { value: 'NaCl',       label: 'NaCl' },
  { value: 'CaCl2',      label: 'CaCl₂' },
  { value: 'MgCl2',      label: 'MgCl₂' },
  { value: 'Na2SO4',     label: 'Na₂SO₄' },
  { value: 'NaCl+CaCl2', label: 'NaCl + CaCl₂' },
  { value: 'NaCl+KCl',   label: 'NaCl + KCl' },
  { value: 'Water',      label: 'Water (pure)' },
]

// Which ion-concentration fields are physically meaningful per brine type
const MCM_ACTIVE = { NaCl: true, Na2SO4: true, 'NaCl+CaCl2': true, 'NaCl+KCl': true }
const BCM_ACTIVE = { CaCl2: true, MgCl2: true, 'NaCl+CaCl2': true }

function FieldRow({ label, unit, value, min, max, step, disabled, onChange }) {
  return (
    <div className={`field-group${disabled ? ' field-disabled' : ''}`}>
      <div className="field-label">
        <span style={{ opacity: disabled ? 0.45 : 1 }}>{label}</span>
        <span className="unit">{unit}</span>
      </div>
      <div className="field-row">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export default function InputPanel({ inputs, regime, isNearCritical, onChange, onPredict }) {
  const regimeClass = isNearCritical ? 'near' : regime
  const regimeLabel = isNearCritical
    ? '⚠ Near-Critical'
    : regime === 'sup' ? 'Supercritical' : 'Subcritical'

  const mcmEnabled = !!MCM_ACTIVE[inputs.brineType]
  const bcmEnabled = !!BCM_ACTIVE[inputs.brineType]
  const canPredict = !!inputs.brineType

  // P, T, or salinity change → always recompute drho via EOS
  const handleEosInput = (field, val) => {
    const P        = field === 'P'        ? parseFloat(val) || 0 : inputs.P
    const T        = field === 'T'        ? parseFloat(val) || 0 : inputs.T
    const salinity = field === 'salinity' ? parseFloat(val) || 0 : (inputs.salinity ?? 1.0)
    const r = computeDrho(P, T, salinity)
    onChange({
      ...inputs,
      [field]: parseFloat(val) || 0,
      drho: parseFloat(r.drho.toFixed(4)),
      eosEstimated: true,
    })
  }

  // Direct drho edit — mark as manual (clears EOS tag)
  const handleDrhoChange = (val) => {
    onChange({ ...inputs, drho: parseFloat(val) || 0, eosEstimated: false })
  }

  const handleBrineChange = (brineType) => {
    const newInputs = { ...inputs, brineType }
    if (!MCM_ACTIVE[brineType]) newInputs.MCM = 0
    if (!BCM_ACTIVE[brineType]) newInputs.BCM = 0
    onChange(newInputs)
  }

  const handleField = (field, val) => {
    onChange({ ...inputs, [field]: parseFloat(val) || 0 })
  }

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <span className="card-title" style={{ marginBottom: 0 }}>Inputs</span>
        <span className={`regime-badge ${regimeClass}`}>{regimeLabel}</span>
      </div>

      {isNearCritical && (
        <div className="near-critical-warning">
          Near-critical conditions detected (Pr or Tr within 2% of 1.0).
          Model not validated in this region — results indicative only.
        </div>
      )}

      {/* ── 1. Brine type — required, top ── */}
      <div className="field-group">
        <div className="field-label">
          <span>
            Brine type&nbsp;<span style={{ color: 'var(--color-red)', fontWeight: 700 }}>*</span>
          </span>
        </div>
        <select
          value={inputs.brineType}
          onChange={e => handleBrineChange(e.target.value)}
          style={{ borderColor: !inputs.brineType ? 'var(--color-red)' : undefined }}
        >
          {BRINE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {!inputs.brineType && (
          <p className="text-muted mt-1" style={{ color: 'var(--color-red)' }}>
            Select a brine type to enable prediction.
          </p>
        )}
        {inputs.brineType === 'Na2SO4' && (
          <p className="text-muted mt-1">
            Na₂SO₄ activates YELLOW QA — +11% apparatus bias known from Li et al. (2012).
          </p>
        )}
      </div>

      <hr className="divider" />

      {/* ── 2. EOS inputs: P, T, salinity → drho ── */}
      <div className="eos-section-label">
        Density EOS — Δρ calculated live from P, T, and salinity
      </div>

      <FieldRow
        label="Pressure" unit="MPa"
        value={inputs.P} min={0.1} max={60} step={0.5}
        onChange={v => handleEosInput('P', v)}
      />

      <FieldRow
        label="Temperature" unit="K"
        value={inputs.T} min={273} max={500} step={1}
        onChange={v => handleEosInput('T', v)}
      />

      <FieldRow
        label="Total salinity (NaCl-equiv.)" unit="mol/kg"
        value={inputs.salinity ?? 1.0} min={0} max={6} step={0.1}
        onChange={v => handleEosInput('salinity', v)}
      />

      {/* ── 3. Δρ — auto-populated, still editable ── */}
      <div className="field-group">
        <div className="field-label">
          <span>
            Density diff (Δρ)
            {inputs.eosEstimated && (
              <span className="eos-tag" style={{ marginLeft: 6 }}>EOS</span>
            )}
          </span>
          <span className="unit">g/cm³</span>
        </div>
        <div className="field-row">
          <input
            type="number"
            value={inputs.drho}
            min={0.001} max={1.1} step={0.001}
            onChange={e => handleDrhoChange(e.target.value)}
          />
          <input
            type="range"
            value={inputs.drho}
            min={0.001} max={1.1} step={0.001}
            onChange={e => handleDrhoChange(e.target.value)}
          />
        </div>
        {!inputs.eosEstimated && (
          <p className="text-muted mt-1">Manual Δρ — change P, T, or salinity to reset to EOS.</p>
        )}
      </div>

      <hr className="divider" />

      {/* ── 4. Ion concentrations — locked by brine type ── */}
      <FieldRow
        label="Monovalent Cation Mol." unit="mol/kg"
        value={inputs.MCM} min={0} max={6} step={0.05}
        disabled={!mcmEnabled}
        onChange={v => handleField('MCM', v)}
      />

      <FieldRow
        label="Bivalent Cation Mol." unit="mol/kg"
        value={inputs.BCM} min={0} max={2} step={0.01}
        disabled={!bcmEnabled}
        onChange={v => handleField('BCM', v)}
      />

      <hr className="divider" />

      {/* ── 5. Gas composition ── */}
      <FieldRow
        label="CH₄ mole fraction" unit="mol/mol"
        value={inputs.x_CH4} min={0} max={0.35} step={0.005}
        onChange={v => handleField('x_CH4', v)}
      />

      <FieldRow
        label="N₂ mole fraction" unit="mol/mol"
        value={inputs.x_N2} min={0} max={0.25} step={0.005}
        onChange={v => handleField('x_N2', v)}
      />

      <button
        className="btn btn-primary"
        onClick={onPredict}
        disabled={!canPredict}
        style={{ opacity: canPredict ? 1 : 0.5, cursor: canPredict ? 'pointer' : 'not-allowed' }}
      >
        Predict IFT
      </button>
    </div>
  )
}
