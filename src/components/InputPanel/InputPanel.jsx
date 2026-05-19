import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { computeDrho } from '../../logic/eosEngine.js'
import { pToSI, tToSI, pFromSI, tFromSI, pMinMax, tMinMax, pLabel, tLabel } from '../../logic/units.js'
import ReservoirPresets from '../ReservoirPresets.jsx'
import DepthConverter from '../DepthConverter.jsx'

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

const MCM_ACTIVE = { NaCl: true, Na2SO4: true, 'NaCl+CaCl2': true, 'NaCl+KCl': true }
const BCM_ACTIVE = { CaCl2: true, MgCl2: true, 'NaCl+CaCl2': true }

function FieldRow({ label, unit, value, min, max, step, disabled, onChange, warning }) {
  return (
    <div className={`field-group${disabled ? ' field-disabled' : ''}`}>
      <div className="field-label">
        <span style={{ opacity: disabled ? 0.45 : 1 }}>
          {label}
          {warning && <span className="validation-warn" title={warning}><AlertTriangle size={14} style={{ marginLeft: 4 }} /></span>}
        </span>
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
          style={warning ? { borderColor: 'var(--color-yellow)' } : undefined}
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
      {warning && <p className="text-muted mt-1" style={{ color: 'var(--color-yellow)', fontSize: '0.7rem' }}>{warning}</p>}
    </div>
  )
}

function isOutside(value, min, max) {
  return value < min || value > max
}

export default function InputPanel({ inputs, regime, isNearCritical, unitSystem, onChange, onPredict, onReset, onPresetChange }) {
  const regimeClass = isNearCritical ? 'near' : regime
  const regimeLabel = isNearCritical
    ? 'Near-Critical'
    : regime === 'sup' ? 'Supercritical' : 'Subcritical'

  const mcmEnabled = !!MCM_ACTIVE[inputs.brineType]
  const bcmEnabled = !!BCM_ACTIVE[inputs.brineType]
  const canPredict = !!inputs.brineType

  const pUnit = unitSystem === 'SI' ? 'MPa' : unitSystem === 'field' ? 'bar' : 'psi'
  const tUnit = unitSystem === 'SI' ? 'K' : unitSystem === 'field' ? 'C' : 'F'

  const displayP = parseFloat(pFromSI(inputs.P, pUnit).toFixed(3))
  const displayT = parseFloat(tFromSI(inputs.T, tUnit).toFixed(2))
  const pBounds = pMinMax(pUnit)
  const tBounds = tMinMax(tUnit)

  const handleEosInput = (field, val) => {
    const raw = parseFloat(val) || 0
    const pSI = field === 'P' ? pToSI(raw, pUnit) : inputs.P
    const tSI = field === 'T' ? tToSI(raw, tUnit) : inputs.T
    const salinity = field === 'salinity' ? raw : (inputs.salinity ?? 1.0)
    const r = computeDrho(pSI, tSI, salinity)
    onChange({
      ...inputs,
      [field]: field === 'P' ? pSI : field === 'T' ? tSI : raw,
      drho: parseFloat(r.drho.toFixed(4)),
      eosEstimated: true,
    })
  }

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

  const pWarning = isOutside(inputs.P, 0.1, 60) ? `Domain: 0.1–60 MPa` : null
  const tWarning = isOutside(inputs.T, 273, 500) ? `Domain: 273–500 K` : null

  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <span className="card-title" style={{ marginBottom: 0 }}>Inputs</span>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={onReset} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }} title="Reset inputs and clear URL">
            Reset
          </button>
          <span className={`regime-badge ${regimeClass}`}>{isNearCritical && <AlertTriangle size={12} style={{ marginRight: 2 }} />}{regimeLabel}</span>
        </div>
      </div>

      {isNearCritical && (
        <div className="near-critical-warning">
          Near-critical conditions detected (Pr or Tr within 2% of 1.0).
          Model not validated in this region — results indicative only.
        </div>
      )}

      <ReservoirPresets onSelect={onPresetChange} activePreset={inputs.presetName} />

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

      <div className="eos-section-label">
        Density EOS — Δρ calculated live from P, T, and salinity
      </div>

      <FieldRow
        label="Pressure" unit={pLabel(pUnit)}
        value={displayP} min={pBounds.min} max={pBounds.max} step={pBounds.step}
        warning={pWarning}
        onChange={v => handleEosInput('P', v)}
      />

      <FieldRow
        label="Temperature" unit={tLabel(tUnit)}
        value={displayT} min={tBounds.min} max={tBounds.max} step={tBounds.step}
        warning={tWarning}
        onChange={v => handleEosInput('T', v)}
      />

      <FieldRow
        label="Total salinity (NaCl-equiv.)" unit="mol/kg"
        value={inputs.salinity ?? 1.0} min={0} max={6} step={0.1}
        onChange={v => handleEosInput('salinity', v)}
      />

      <div className="field-group">
        <div className="field-label">
          <span>
            Density diff (Δρ)
            {inputs.eosEstimated && <span className="eos-tag" style={{ marginLeft: 6 }}>EOS</span>}
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

      <DepthConverter onApply={({ P, T }) => onChange({ ...inputs, P, T })} />

      <hr className="divider" />

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
        id="predict-btn"
        className="btn btn-primary"
        onClick={onPredict}
        disabled={!canPredict}
        style={{ opacity: canPredict ? 1 : 0.5, cursor: canPredict ? 'pointer' : 'not-allowed' }}
      >
        Predict IFT
      </button>
      <p className="text-muted" style={{ fontSize: '0.65rem', marginTop: '0.35rem', textAlign: 'center' }}>
        Ctrl+Enter to predict · Escape to reset
      </p>
    </div>
  )
}
