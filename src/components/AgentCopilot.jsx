import React, { useState, useRef } from 'react'
import {
  Sparkles, ShieldCheck, AlertTriangle, ShieldAlert, Play, KeyRound,
  CheckCircle2, FileText, ArrowUpRight, FlaskConical, Trash2, Compass,
  HelpCircle, Eye, EyeOff, Layers, Activity
} from 'lucide-react'
import { runAgentAssurance } from '../logic/agentEngine.js'
import { saveExperimentalGap, clearExperimentalGaps } from '../logic/db.js'
import { exportAssuranceBriefPDF } from '../logic/exportEngine.js'
import { parseExecutiveBlocks } from '../logic/formatText.js'
import RichScientificText from './RichScientificText.jsx'

const SAMPLE_QUESTIONS = [
  'What are the best operating values for Sarawak formation?',
  'Can the Sleipner caprock safely hold a 200 m CO₂ column?',
  'Evaluate In Salah Krechba against a 15 m static intra-reservoir column',
  'Can shallow Peterhead safely contain a 100 m CO₂ plume at 5.2 MPa and 32 °C?',
  'Assess deep UAE carbonate at 10,865 ft (134 °C) for a 150 m column',
]

const KEY_STORAGE = 'ift-gemini-api-key'
const ENV_DEFAULT_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || ''

export default function AgentCopilot({ currentInputs, onApplyInputs }) {
  const [question, setQuestion] = useState('')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE) || ENV_DEFAULT_KEY)
  const [showKeyBox, setShowKeyBox] = useState(false)
  const [revealKey, setRevealKey] = useState(false)
  const [running, setRunning] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [report, setReport] = useState(null)
  const [sessionGaps, setSessionGaps] = useState([])
  const inputRef = useRef(null)

  const handleSaveKey = (val) => {
    setApiKey(val)
    if (val.trim()) localStorage.setItem(KEY_STORAGE, val.trim())
    else localStorage.removeItem(KEY_STORAGE)
  }

  const handleSelectSample = (sq) => {
    setQuestion(sq)
    inputRef.current?.focus()
  }

  const handleExecute = async (qText = question) => {
    const trimmed = qText.trim()
    if (!trimmed) {
      inputRef.current?.focus()
      return
    }
    setRunning(true)
    try {
      const res = await runAgentAssurance(trimmed, currentInputs, apiKey)
      setReport(res)
      if (!res.needsClarification && res.prescription?.experimentalGapSpec) {
        const gapSpec = res.prescription.experimentalGapSpec
        await saveExperimentalGap(gapSpec).catch(() => {})
        setSessionGaps(prev => [
          { id: Date.now(), ...gapSpec },
          ...prev.filter(g => g.siteName !== gapSpec.siteName),
        ])
      }
    } finally {
      setRunning(false)
    }
  }

  const handleClearGaps = async () => {
    await clearExperimentalGaps().catch(() => {})
    setSessionGaps([])
  }

  const handleDownloadPdf = async () => {
    if (!report || report.needsClarification) return
    setExportingPdf(true)
    try {
      await exportAssuranceBriefPDF(report)
    } finally {
      setExportingPdf(false)
    }
  }

  const verdictColor =
    report?.prescription?.badgeColor === 'GREEN'
      ? 'var(--green)'
      : report?.prescription?.badgeColor === 'AMBER'
      ? 'var(--yellow)'
      : 'var(--red)'

  const narrativeBlocks = report?.llmNarrative ? parseExecutiveBlocks(report.llmNarrative) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
      {/* Top SEAL Command Card */}
      <div className="card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group">
            <span className="card-title">
              <Sparkles size={17} color="var(--accent)" />
              SEAL &mdash; Subsurface Evaluation &amp; Assurance Lead
            </span>
            <span className="card-subtitle">
              &ldquo;The AI model calculates. SEAL reasons about whether to trust the calculation and what to do next.&rdquo;
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`seal-status-pill ${apiKey ? 'live' : 'offline'}`}
              onClick={() => setShowKeyBox(v => !v)}
              title="Configure SEAL Cloud AI Reasoning Key"
            >
              <span className="seal-status-dot" />
              <span>{apiKey ? 'SEAL · Cloud AI Active' : 'SEAL · Local Physics Mode'}</span>
              <KeyRound size={14} style={{ opacity: 0.8 }} />
            </button>
          </div>
        </div>

        {/* Sleek API Key Configuration Drawer with Password / Plaintext Toggle */}
        {showKeyBox && (
          <div className="seal-key-drawer">
            <div className="seal-key-header">
              <div>
                <div className="seal-key-title">SEAL Cloud AI Key (Google AI Studio)</div>
                <div className="seal-key-sub">
                  All MARS, Peng–Robinson EOS, and Young–Laplace equations execute deterministically in your browser. Connecting an AI key enables natural-language basin inference and executive brief synthesis.
                </div>
              </div>
              <span className={`regime-badge ${apiKey ? 'sup' : 'sub'}`} style={{ textTransform: 'none' }}>
                {apiKey ? 'Cloud AI Connected' : 'Local Physics Only'}
              </span>
            </div>

            <div className="seal-key-input-group">
              <KeyRound size={16} className="seal-key-icon" />
              <input
                type={revealKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => handleSaveKey(e.target.value)}
                placeholder="Paste Google AI Studio key (AIzaSy...) or leave blank for built-in 20-basin physics mode"
                aria-label="Google AI Studio API Key"
                autoComplete="off"
                spellCheck={false}
                className="seal-key-input mono"
              />
              <button
                type="button"
                className="seal-key-action-btn"
                onClick={() => setRevealKey(r => !r)}
                title={revealKey ? 'Hide API key' : 'Show API key'}
                aria-label={revealKey ? 'Hide API key' : 'Show API key'}
              >
                {revealKey ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{revealKey ? 'Hide' : 'Show'}</span>
              </button>
              {apiKey && (
                <button
                  type="button"
                  className="seal-key-action-btn danger"
                  onClick={() => {
                    handleSaveKey('')
                    setRevealKey(false)
                  }}
                  title="Clear saved API key"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick Sample Decision Prompts (Populates input without auto-running) */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.45rem' }}>
            Sample Executive Questions (click to populate, then press <strong style={{ color: 'var(--text-main)' }}>Ask SEAL</strong>):
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {SAMPLE_QUESTIONS.map((sq, idx) => (
              <button
                key={sq}
                type="button"
                className={`preset-chip ${question === sq ? 'active' : ''} ${idx >= 2 ? 'sample-q-extra' : ''}`}
                onClick={() => handleSelectSample(sq)}
              >
                {sq}
              </button>
            ))}
          </div>
        </div>

        {/* Question Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault()
            handleExecute()
          }}
          className="seal-query-form"
        >
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask SEAL a containment or optimization question (e.g. 'What are the best operating values for Sarawak formation?')"
            aria-label="Engineering decision question for SEAL"
            className="seal-query-input"
          />
          <button
            type="submit"
            className="btn btn-primary seal-run-btn"
            disabled={running || !question.trim()}
          >
            <Play size={15} fill="currentColor" />
            <span>{running ? 'SEAL Evaluating…' : 'Ask SEAL'}</span>
          </button>
        </form>
      </div>

      {/* Loading Progress Card */}
      {running && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          <Sparkles size={26} color="var(--accent)" style={{ marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            SEAL is auditing reservoir thermodynamics &amp; containment risk…
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Peng–Robinson EOS &rarr; Closed-Form MARS &rarr; Composite Trust Audit &rarr; Capillary Seal Propagation
          </div>
        </div>
      )}

      {/* Calm Executive Ready State before first query */}
      {!report && !running && (
        <div className="seal-empty-grid">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem', color: 'var(--accent-text)', fontWeight: 700, fontSize: '0.94rem' }}>
              <Compass size={18} />
              <span>1. Formation &amp; EOS Resolution</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Resolves 20 curated global &amp; Malaysian CCS basins (Sarawak Kasawari, Malay Basin, Sleipner, In Salah, UAE) or infers published geology via Cloud AI, computing phase density contrast Δρ from Peng–Robinson + Rowe–Chou EOS.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem', color: 'var(--green)', fontWeight: 700, fontSize: '0.94rem' }}>
              <ShieldCheck size={18} />
              <span>2. Composite Conformal Trust Audit</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Evaluates closed-form 16-term / 35-term MARS equations and verifies Kay&apos;s phase regime, Hat-matrix leverage h*, ±2 °C near-critical exclusion, cross-laboratory UIF<sub>interval</sub> portability, and thermal training bounds.
            </p>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.45rem', color: 'var(--color-sub)', fontWeight: 700, fontSize: '0.94rem' }}>
              <Layers size={18} />
              <span>3. Operating Window &amp; PDF Brief</span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Sweeps reservoir depth &amp; 25-state operating grids to identify GREEN (P*, T*) states within the validated domain, computes capillary seal clearance odds, and exports a PDF Executive Brief.
            </p>
          </div>
        </div>
      )}

      {/* Unrecognized Formation Clarification Card */}
      {report?.needsClarification && !running && (
        <div className="card" style={{ borderColor: 'rgba(245, 158, 11, 0.45)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
            <HelpCircle size={22} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--yellow)', fontSize: '0.96rem', marginBottom: '0.35rem' }}>
                Formation Parameters Needed (Refusing to Substitute Another Site)
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {report.clarificationMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Decision Verdict, Optimization Window, & Verification Workflow */}
      {report && !report.needsClarification && !running && (
        <div className="main-layout">
          {/* Left Column: Clean Verification Workflow (No raw JS function names!) + Envelope Sweep */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            <div className="card">
              <div className="card-title-row">
                <div className="card-title-group">
                  <span className="card-title">
                    <Activity size={16} color="var(--accent)" />
                    {report.trace.length}-Stage Verification Workflow
                  </span>
                  <span className="card-subtitle">{report.engineUsed}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {report.trace.map(t => (
                  <div key={t.step} className="seal-trace-step">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--accent-text)', fontSize: '0.88rem' }}>
                        {t.step}. {t.title}
                      </strong>
                      {t.badge && (
                        <span className="seal-stage-badge mono">{t.badge}</span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      <RichScientificText text={t.detail} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Verdict Banner, Optimization Card, SEAL Synthesis, & Session Gap Log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.35rem' }}>
            <div className="hero-hud-card">
              <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', flex: '1 1 260px' }}>
                  {report.prescription.badgeColor === 'GREEN' && <ShieldCheck size={26} color="var(--green)" style={{ marginTop: 2, flexShrink: 0 }} />}
                  {report.prescription.badgeColor === 'AMBER' && <AlertTriangle size={26} color="var(--yellow)" style={{ marginTop: 2, flexShrink: 0 }} />}
                  {report.prescription.badgeColor === 'RED' && <ShieldAlert size={26} color="var(--red)" style={{ marginTop: 2, flexShrink: 0 }} />}
                  <div>
                    <div className="mono" style={{ fontSize: '1.32rem', fontWeight: 800, color: verdictColor, lineHeight: 1.15 }}>
                      {report.prescription.decision}
                    </div>
                    <div style={{ fontSize: '0.92rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                      <strong>{report.resolved.siteName}</strong> &middot; Target Column &ge; {report.propagation.targetColumnM} m
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.45 }}>
                      {report.resolved.literatureInferred ? 'Regional Basin Literature · ' : 'Curated Basin Atlas · '}
                      <RichScientificText text={report.resolved.basisNote} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {onApplyInputs && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => onApplyInputs(report.resolved.inputs)}
                      title="Load these resolved state parameters into the main Predictor HUD"
                    >
                      <ArrowUpRight size={15} />
                      <span>Load in HUD</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleDownloadPdf}
                    disabled={exportingPdf}
                    title="Export branded SEAL Executive Assurance Brief as PDF"
                  >
                    <FileText size={15} />
                    <span>{exportingPdf ? 'Generating PDF…' : 'Export PDF Brief'}</span>
                  </button>
                </div>
              </div>

              <div className="hero-percentile-grid" style={{ marginTop: '0.95rem' }}>
                <div className="hud-tile">
                  <div className="hud-tile-tag">Plausible Clearance Odds</div>
                  <div className="hud-tile-value mono" style={{ color: verdictColor }}>
                    {report.propagation.clearancePct.toFixed(1)}%
                  </div>
                  <div className="hud-tile-unit">of envelope clears {report.propagation.targetColumnM} m</div>
                </div>

                <div className="hud-tile hud-tile--p50">
                  <div className="hud-tile-tag">MARS IFT [P90 / P50 / P10]</div>
                  <div className="hud-tile-value mono" style={{ fontSize: '1.9rem' }}>
                    {report.marsResult.p50.toFixed(2)}
                  </div>
                  <div className="hud-tile-unit mono">
                    [{report.marsResult.p90.toFixed(2)}, {report.marsResult.p10.toFixed(2)}] mN/m
                  </div>
                </div>

                <div className="hud-tile">
                  <div className="hud-tile-tag">Column Height [P90 / P50 / P10]</div>
                  <div className="hud-tile-value mono" style={{ fontSize: '1.65rem' }}>
                    {report.propagation.H_m.p50.toFixed(1)} m
                  </div>
                  <div className="hud-tile-unit mono">
                    [{report.propagation.H_m.p90.toFixed(1)}, {report.propagation.H_m.p10.toFixed(1)}] m
                  </div>
                </div>
              </div>

              {/* Dedicated Optimal Operating Window Panel */}
              {report.optimization && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem 1.15rem',
                  background: 'var(--green-dim)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  lineHeight: 1.55,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Compass size={16} /> Recommended GREEN Operating Window ({report.optimization.greenCount}/{report.optimization.evaluatedCount} states screened)
                    </span>
                    {onApplyInputs && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', minHeight: '34px' }}
                        onClick={() =>
                          onApplyInputs({
                            ...report.resolved.inputs,
                            P: report.optimization.bestBalanced.P,
                            T: report.optimization.bestBalanced.T_K,
                            drho: report.optimization.bestBalanced.drho,
                            eosEstimated: true,
                          })
                        }
                      >
                        Apply Optimal P* &amp; T* to HUD &rarr;
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.7rem' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Safe GREEN Corridor</div>
                      <div className="mono" style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
                        P: {report.optimization.safeWindowP_MPa[0].toFixed(1)}–{report.optimization.safeWindowP_MPa[1].toFixed(1)} MPa
                      </div>
                      <div className="mono" style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                        T: {report.optimization.safeWindowT_C[0].toFixed(1)}–{report.optimization.safeWindowT_C[1].toFixed(1)} °C
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Best Storage-Efficiency State</div>
                      <div className="mono" style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--accent-text)', marginTop: '0.15rem' }}>
                        P* = {report.optimization.bestBalanced.P.toFixed(2)} MPa &middot; T* = {report.optimization.bestBalanced.T_C.toFixed(1)} °C
                      </div>
                      <div className="mono" style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                        γ<sub>P50</sub> = {report.optimization.bestBalanced.p50} mN/m &middot; H<sub>90</sub> = {report.optimization.bestBalanced.H90} m
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Diagnosis & Prescription Box */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem 1.15rem',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Main Risk Diagnosis: </strong>
                  <span style={{ color: 'var(--text-muted)' }}><RichScientificText text={report.prescription.primaryRisk} /></span>
                </div>
                <div>
                  <strong style={{ color: 'var(--accent-text)' }}>Recommended Next Engineering Action: </strong>
                  <span style={{ color: 'var(--text-main)' }}><RichScientificText text={report.prescription.nextAction} /></span>
                </div>
              </div>

              {/* Cleanly Formatted SEAL Executive Synthesis */}
              {narrativeBlocks.length > 0 && (
                <div className="seal-synthesis-card">
                  <div className="seal-synthesis-header">
                    <CheckCircle2 size={16} />
                    <span>SEAL Executive Synthesis (Grounded on Verified MARS + PR-EOS Outputs)</span>
                  </div>
                  <div className="seal-narrative-list">
                    {narrativeBlocks.map((block, idx) => (
                      <div
                        key={idx}
                        className={block.type === 'bullet' ? 'seal-narrative-bullet' : 'seal-narrative-para'}
                      >
                        {block.type === 'bullet' && <span className="seal-bullet-dot" />}
                        <div>
                          {block.segments.map((seg, sIdx) =>
                            seg.bold ? (
                              <strong key={sIdx} style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                                <RichScientificText text={seg.text} />
                              </strong>
                            ) : (
                              <span key={sIdx}><RichScientificText text={seg.text} /></span>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formation Envelope Sweep — wide right column for all 11 slices */}
            <div className="card">
              <div className="card-title-row">
                <div className="card-title-group">
                  <span className="card-title">Formation Envelope Sweep (Crest &rarr; Base)</span>
                  <span className="card-subtitle">Uncertainty explored across depth, P, T &amp; conformal quantiles</span>
                </div>
              </div>
              <div className="batch-table-container">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Horizon</th>
                      <th style={{ textTransform: 'none' }}>P (MPa)</th>
                      <th style={{ textTransform: 'none' }}>T (°C)</th>
                      <th style={{ textTransform: 'none' }}>Δρ (g/cm³)</th>
                      <th style={{ textTransform: 'none' }}>P50 (mN/m)</th>
                      <th style={{ textTransform: 'none' }}>P90–P10 (mN/m)</th>
                      <th>Trust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.envelope.slices.map((s, idx) => (
                      <tr key={idx}>
                        <td className="mono">{s.label}</td>
                        <td className="mono">{s.P.toFixed(2)}</td>
                        <td className="mono">{(s.T - 273.15).toFixed(1)}</td>
                        <td className="mono">{s.drho.toFixed(3)}</td>
                        <td className="mono">{s.p50.toFixed(2)}</td>
                        <td className="mono">[{s.p90.toFixed(2)}, {s.p10.toFixed(2)}]</td>
                        <td>
                          <span className={`history-status ${s.status.toLowerCase()}`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Session-Scoped Active-Learning Gap Log */}
            {sessionGaps.length > 0 && (
              <div className="card">
                <div className="card-title-row">
                  <div className="card-title-group">
                    <span className="card-title">
                      <FlaskConical size={16} color="var(--yellow)" />
                      Active-Learning Experimental Gap Log ({sessionGaps.length})
                    </span>
                    <span className="card-subtitle">
                      Session-logged Yellow/Red domain &amp; portability gaps requiring targeted lab testing (n &ge; 30 conformal recalibration)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClearGaps}
                    style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', minHeight: '34px' }}
                  >
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                </div>

                <div className="batch-table-container">
                  <table className="batch-table">
                    <thead>
                      <tr>
                        <th>Formation</th>
                        <th>Target Lab P (MPa)</th>
                        <th>Target Lab T (°C)</th>
                        <th>Brine Spec</th>
                        <th>Trigger</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionGaps.map((g, i) => (
                        <tr key={g.id || i}>
                          <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{g.siteName}</td>
                          <td className="mono">{g.recommendedP_MPa}</td>
                          <td className="mono">{g.recommendedT_C}</td>
                          <td style={{ fontFamily: 'var(--font-sans)' }}>{g.brineSpec}</td>
                          <td>
                            <span className={`history-status ${g.trustVerdict?.toLowerCase() || 'amber'}`}>
                              {g.trustVerdict}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
