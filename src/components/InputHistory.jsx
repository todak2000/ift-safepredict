import React, { useState, useEffect } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { getPredictions, deletePrediction, clearAllPredictions } from '../logic/db.js'

export default function InputHistory({ onLoad }) {
  const [history, setHistory] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    getPredictions(50).then(setHistory).catch(() => {})
  }, [open])

  const handleDelete = async (id) => {
    await deletePrediction(id)
    setHistory(prev => prev.filter(h => h.id !== id))
  }

  const handleClear = async () => {
    await clearAllPredictions()
    setHistory([])
  }

  const handleLoad = (entry) => {
    if (onLoad) onLoad(entry.inputs)
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div
        className="flex-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="card-title" style={{ marginBottom: 0 }}>
          Input History ({history.length})
        </span>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </div>

      {open && (
        <div style={{ marginTop: '0.75rem' }}>
          {history.length === 0 && (
            <p className="text-muted" style={{ padding: '0.5rem 0' }}>
              No saved predictions yet. Each prediction is saved automatically.
            </p>
          )}

          {history.length > 0 && (
            <>
              <div className="history-list">
                {history.map(entry => (
                  <div key={entry.id} className="history-item">
                    <div className="history-item-info" onClick={() => handleLoad(entry)}>
                      <div className="history-item-primary">
                        IFT = {entry.result?.p50?.toFixed(2) ?? '?'} mN/m
                        <span className={`history-status ${entry.result?.status?.toLowerCase() || 'green'}`}>
                          {entry.result?.status || '—'}
                        </span>
                      </div>
                      <div className="history-item-meta">
                        {entry.inputs?.brineType} · P={entry.inputs?.P} MPa · T={entry.inputs?.T} K ·{' '}
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                onClick={handleClear}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                Clear All History
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
