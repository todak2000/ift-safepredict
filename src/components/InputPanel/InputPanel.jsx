import React from 'react'
import { AlertTriangle, RotateCcw, Play, RefreshCw } from 'lucide-react'
import { computeDrho } from '../../logic/eosEngine.js'
import { pToSI, tToSI, pFromSI, tFromSI, pMinMax, tMinMax } from '../../logic/units.js'
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

function FieldRow({ label, symbol, unit, value, min, max, step, disabled, onChange, warning }) {
  return (
    <div className={`param-group${disabled ? ' field-disabled' : ''}`} style={disabled ? { opacity: 0.45 } : undefined}>
      <div className="param-header">
        <div className="param-label-left">
          <label className="param-label">{label}</label>
          {symbol && <span className="param-symbol">{symbol}</span>}
          {warning && (
            <span className="validation-warn" title={warning}>
              <AlertTriangle size={13} style={{ color: 'var(--yellow)', marginLeft: 3 }} />
            </span>
          )}
        </div>
        <div className="param-val-pill mono">
          {typeof value === 'number' ? value : value} {unit}
        </div>
      </div>
      <div className="param-control-row">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
        <div className="param-num-wrap">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            style={warning ? { borderColor: 'var(--yellow)' } : undefined}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      </div>
      {warning && (
        <p style={{ color: 'var(--yellow)', fontSize: '0.68rem', marginTop: '0.25rem' }}>
          {warning}
        </p>
      )}
    </div>
  )
}

function isOutside(value, min, max) {
  return value < min || value > max
}

export default function InputPanel({ inputs, regime, isNearCritical, unitSystem, onChange, onPredict, onReset, onPresetChange }) {
  const regimeClass = isNearCritical ? 'near' : regime
  const regimeLabel = isNearCritical
    ? `${regime === 'sup' ? 'Sup' : 'Sub'} · Near-Critical`
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

  const recomputeWithEos = (next) => {
    const r = computeDrho(next.P, next.T, next.salinity ?? next.MCM ?? 0, {
      BCM: next.BCM ?? 0,
      x_CH4: next.x_CH4 ?? 0,
      x_N2: next.x_N2 ?? 0,
    })
    return {
      ...next,
      drho: parseFloat(r.drho.toFixed(4)),
      eosEstimated: true,
    }
  }

  const handleEosInput = (field, val) => {
    const raw = parseFloat(val) || 0
    const next = {
      ...inputs,
      presetName: '',
      [field]: field === 'P' ? pToSI(raw, pUnit) : field === 'T' ? tToSI(raw, tUnit) : raw,
    }
    onChange(recomputeWithEos(next))
  }

  const handleDrhoChange = (val) => {
    onChange({ ...inputs, presetName: '', drho: parseFloat(val) || 0, eosEstimated: false })
  }

  const handleRecomputeEosClick = () => {
    onChange(recomputeWithEos({ ...inputs }))
  }

  const handleBrineChange = (brineType) => {
    const next = { ...inputs, presetName: '', brineType }
    if (!MCM_ACTIVE[brineType]) next.MCM = 0
    if (!BCM_ACTIVE[brineType]) next.BCM = 0
    if (brineType === 'Water') next.salinity = 0
    else next.salinity = parseFloat(((next.MCM || 0) + (next.BCM || 0)).toFixed(3))
    onChange(recomputeWithEos(next))
  }

  const handleField = (field, val) => {
    const num = parseFloat(val) || 0
    const next = { ...inputs, presetName: '', [field]: num }
    if (field === 'MCM' || field === 'BCM') {
      next.salinity = parseFloat(((next.MCM || 0) + (next.BCM || 0)).toFixed(3))
    }
    if (inputs.eosEstimated) {
      onChange(recomputeWithEos(next))
    } else {
      onChange(next)
    }
  }

  const pWarning = isOutside(inputs.P, 0.1, 70) ? `Domain: 0.1–70 MPa` : null
  const tWarning = isOutside(inputs.T, 273, 473) ? `Domain: 273–473 K` : null
  const bcmMax = regime === 'sub' ? 1.5 : 5.0
  const bcmWarning = bcmEnabled && inputs.BCM > bcmMax ? `Subcritical training max BCM is 1.50 mol/kg` : null

  return (
    <div className="card">
      <div className="card-title-row">
        <div className="card-title-group">
          <span className="card-title">Operating Parameters</span>
          <span className="card-subtitle">In-situ thermobaric &amp; brine conditions</span>
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={onReset}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="Reset to defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <span className={`regime-badge ${regimeClass}`}>
            {isNearCritical && <AlertTriangle size={12} style={{ marginRight: 2 }} />}
            {regimeLabel}
          </span>
        </div>
      </div>

      {/* Geological Quick Select Chips */}
      <ReservoirPresets onSelect={onPresetChange} activePreset={inputs.presetName} />

      {/* Brine selector */}
      <div className="param-group">
        <div className="param-header">
          <label className="param-label" htmlFor="brine-select">Brine Chemistry</label>
          <span className="param-symbol">Ionic System</span>
        </div>
        <select
          id="brine-select"
          value={inputs.brineType}
          onChange={e => handleBrineChange(e.target.value)}
          style={{ width: '100%' }}
        >
          {BRINE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {inputs.brineType === 'Na2SO4' && (
          <p style={{ color: 'var(--yellow)', fontSize: '0.68rem', marginTop: '0.35rem' }}>
            Na₂SO₄ sulphate brine: unseen anion in subcritical training (+12.04% in-domain offset in Li et al., 2012); flagged in composite trust audit.
          </p>
        )}
      </div>

      {/* Primary Thermodynamic sliders */}
      <FieldRow
        label="Pressure"
        symbol="P"
        unit={pUnit}
        value={displayP}
        min={pBounds.min}
        max={pBounds.max}
        step={pBounds.step}
        warning={pWarning}
        onChange={val => handleEosInput('P', val)}
      />

      <FieldRow
        label="Temperature"
        symbol="T"
        unit={tUnit}
        value={displayT}
        min={tBounds.min}
        max={tBounds.max}
        step={tBounds.step}
        warning={tWarning}
        onChange={val => handleEosInput('T', val)}
      />

      {/* Salinity */}
      <FieldRow
        label="Total Salinity (NaCl-equiv)"
        symbol={<>m<sub>tot</sub></>}
        unit="mol/kg"
        value={inputs.salinity ?? 1.0}
        min={0}
        max={6}
        step={0.05}
        onChange={val => handleEosInput('salinity', val)}
      />

      {/* Density Difference Δρ */}
      <div className="param-group">
        <div className="param-header">
          <div className="param-label-left">
            <label className="param-label">Phase Density Difference</label>
            <span className="param-symbol">Δρ</span>
            {inputs.eosEstimated ? (
              <span className="eos-tag" style={{ marginLeft: 4 }}>PR-EOS auto</span>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={handleRecomputeEosClick}
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                title="Recompute Δρ from Peng–Robinson + Rowe–Chou EOS"
              >
                <RefreshCw size={10} /> PR-EOS sync
              </button>
            )}
          </div>
          <div className="param-val-pill mono">
            {Number(inputs.drho).toFixed(4)} g/cm³
          </div>
        </div>
        <div className="param-control-row">
          <input
            type="range"
            value={inputs.drho}
            min={0.001}
            max={1.15}
            step={0.001}
            onChange={e => handleDrhoChange(e.target.value)}
          />
          <div className="param-num-wrap">
            <input
              type="number"
              value={inputs.drho}
              min={0.001}
              max={1.15}
              step={0.0001}
              onChange={e => handleDrhoChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cations */}
      <FieldRow
        label="Monovalent Cation Molality"
        symbol="MCM"
        unit="mol/kg"
        value={inputs.MCM}
        min={0}
        max={4.95}
        step={0.05}
        disabled={!mcmEnabled}
        onChange={val => handleField('MCM', val)}
      />

      <FieldRow
        label="Bivalent Cation Molality"
        symbol="BCM"
        unit="mol/kg"
        value={inputs.BCM}
        min={0}
        max={5.0}
        step={0.05}
        disabled={!bcmEnabled}
        warning={bcmWarning}
        onChange={val => handleField('BCM', val)}
      />

      {/* Gas Impurities */}
      <FieldRow
        label="Methane Impurity"
        symbol={<>x<sub>CH₄</sub></>}
        unit="mol/mol"
        value={inputs.x_CH4}
        min={0}
        max={0.890}
        step={0.005}
        onChange={val => handleField('x_CH4', val)}
      />

      <FieldRow
        label="Nitrogen Impurity"
        symbol={<>x<sub>N₂</sub></>}
        unit="mol/mol"
        value={inputs.x_N2}
        min={0}
        max={0.7636}
        step={0.005}
        onChange={val => handleField('x_N2', val)}
      />

      <DepthConverter onApply={({ P, T }) => {
        onChange(recomputeWithEos({ ...inputs, presetName: '', P, T }))
      }} />

      {/* Predict Button */}
      <div style={{ marginTop: '1.35rem' }}>
        <button
          id="predict-btn"
          className="btn btn-primary"
          style={{ width: '100%', minHeight: '50px', padding: '0.75rem 1.2rem', fontSize: '0.98rem' }}
          disabled={!canPredict}
          onClick={onPredict}
        >
          <Play size={16} fill="currentColor" />
          <span>Calculate Interfacial Tension</span>
        </button>
        {!canPredict ? (
          <p style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--yellow)', marginTop: '0.5rem' }}>
            Select a brine chemistry above to run prediction
          </p>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Ctrl+Enter to calculate &middot; Esc to reset
          </p>
        )}
      </div>
    </div>
  )
}
