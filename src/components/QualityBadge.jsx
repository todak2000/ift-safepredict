import React from 'react'
import { AlertTriangle, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react'
import RichScientificText from './RichScientificText.jsx'

const LABELS = {
  GREEN: <>COMPOSITE VERDICT: GREEN &middot; Certified In-Domain &amp; Portable</>,
  AMBER: <>COMPOSITE VERDICT: YELLOW / AMBER &middot; Caution &mdash; Interval Escalated or Local Verification Advised</>,
  RED:   <>COMPOSITE VERDICT: RED &middot; Extrapolation / Uncalibrated Shift &mdash; Do Not Rely Without Lab Data</>,
}

const DOT_COLORS = {
  GREEN: 'var(--green)',
  AMBER: 'var(--yellow)',
  RED: 'var(--red)',
}

export default function QualityBadge({ status, adStatus, message, uif, h, hStar, checks = [] }) {
  if (!status) return null

  return (
    <div className={`qa-badge ${status}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.65rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
        <div className="dot" style={{ marginTop: '0.32rem' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {status === 'GREEN' && <ShieldCheck size={16} color="var(--green)" />}
            {status === 'AMBER' && <AlertTriangle size={16} color="var(--yellow)" />}
            {status === 'RED' && <ShieldAlert size={16} color="var(--red)" />}
            <span>{LABELS[status]}</span>
          </div>
          <div style={{ fontSize: '0.86rem', marginTop: '0.3rem', color: 'var(--text-main)', opacity: 0.95, lineHeight: 1.5 }}>
            <RichScientificText text={message} />
          </div>
          <div style={{ display: 'flex', gap: '1.1rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>Applied Multiplier = {Number(uif).toFixed(2)}&times;</span>
            {h !== undefined && hStar !== undefined && (
              <span>Leverage h = {h.toFixed(4)} (h* = {hStar.toFixed(4)}, AD: {adStatus || status})</span>
            )}
          </div>
        </div>
      </div>

      {checks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.5rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {checks.map(chk => (
            <div
              key={chk.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.45rem',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.81rem',
                lineHeight: 1.4,
              }}
            >
              <CheckCircle2 size={14} style={{ color: DOT_COLORS[chk.status] || 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{chk.label}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                  <RichScientificText text={chk.detail} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
