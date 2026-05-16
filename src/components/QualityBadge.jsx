import React from 'react'

const LABELS = {
  GREEN:  'GREEN ✓ Standard',
  YELLOW: 'YELLOW ⚠ High Variation',
  RED:    'RED ⚠ Extrapolation',
}

export default function QualityBadge({ status, message, uif, violatingFeatures }) {
  if (!status) return null

  return (
    <div className={`qa-badge ${status}`}>
      <div className="dot" />
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{LABELS[status]}</div>
        <div style={{ fontSize: '0.75rem', marginTop: '0.2rem', opacity: 0.9 }}>{message}</div>
        {uif !== 1.0 && (
          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.7 }}>
            UIF = {uif} — interval widened by {uif}×
          </div>
        )}
        {violatingFeatures?.length > 0 && (
          <div style={{ fontSize: '0.7rem', marginTop: '0.2rem', opacity: 0.7 }}>
            Out-of-domain: {violatingFeatures.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
