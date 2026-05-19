import React, { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// ─── Rendering helpers ──────────────────────────────────────────────────────
function BlockMath({ latex }) {
  let html = ''
  try {
    html = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      errorColor: '#ef4444',
      strict: false,
    })
  } catch (e) {
    html = `<span style="color:#ef4444">LaTeX error: ${e.message}</span>`
  }
  return (
    <div
      style={{ overflowX: 'auto', padding: '0.6rem 0', textAlign: 'center' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function InlineMath({ latex }) {
  let html = ''
  try {
    html = katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      errorColor: '#ef4444',
      strict: false,
    })
  } catch (e) {
    html = `<span style="color:#ef4444">${e.message}</span>`
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Section heading ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-primary)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.4rem',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

// ─── Equation block with label ────────────────────────────────────────────────
function EqBlock({ label, latex, note }) {
  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.75rem',
        border: '1px solid var(--color-border)',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
            fontWeight: 600,
            marginBottom: '0.3rem',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </div>
      )}
      <BlockMath latex={latex} />
      {note && (
        <div
          style={{
            fontSize: '0.68rem',
            color: 'var(--color-text-muted)',
            marginTop: '0.3rem',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          {note}
        </div>
      )}
    </div>
  )
}

// ─── Variable legend table ────────────────────────────────────────────────────
const LEGEND_ROWS = [
  ['\\tilde{P}_r', 'Scaled reduced pressure', 'Subcritical & Supercritical'],
  ['\\tilde{T}_r', 'Scaled reduced temperature', 'Subcritical & Supercritical'],
  ['\\tilde{d}', 'Scaled (\\Delta\\rho)^2', 'Both'],
  ['\\widetilde{\\text{MCM}}', 'Scaled monovalent cation molality', 'Both'],
  ['\\widetilde{\\text{BCM}}', 'Scaled bivalent cation molality', 'Both'],
  ['\\tilde{c}', 'Scaled x_{\\text{CH}_4}', 'Both'],
  ['\\tilde{n}', 'Scaled x_{\\text{N}_2}', 'Both'],
]

const BOUNDS_SUB = [
  ['P_r', '0.01355', '4.69460'],
  ['T_r', '0.91495', '2.21720'],
  ['(\\Delta\\rho)^2', '0.000132', '1.29489'],
  ['\\text{MCM}', '0.0', '4.90'],
  ['\\text{BCM}', '0.0', '1.50'],
  ['x_{\\text{CH}_4}', '0.0', '89.0\\%'],
  ['x_{\\text{N}_2}', '0.0', '76.36\\%'],
]

const BOUNDS_SUP = [
  ['P_r', '1.00271', '9.41870'],
  ['T_r', '1.01255', '2.21720'],
  ['(\\Delta\\rho)^2', '0.001681', '1.60309'],
  ['\\text{MCM}', '0.0', '4.95'],
  ['\\text{BCM}', '0.0', '5.00'],
  ['x_{\\text{CH}_4}', '0.0', '89.0\\%'],
  ['x_{\\text{N}_2}', '0.0', '76.36\\%'],
]

// ─── LaTeX equation strings ────────────────────────────────────────────────────

const EQ_SCALING = `\\tilde{x}_i = 2 \\cdot \\frac{x_i - x_i^{\\min}}{x_i^{\\max} - x_i^{\\min}} - 1, \\qquad \\tilde{x}_i \\in [-1,\\;1]`

const EQ_KAYS = `\\begin{aligned}
x_{\\mathrm{CO}_2} &= 1 - x_{\\mathrm{CH}_4} - x_{\\mathrm{N}_2} \\\\[6pt]
P_{c,\\mathrm{mix}} &= 7.377\\,x_{\\mathrm{CO}_2} + 4.600\\,x_{\\mathrm{CH}_4} + 3.390\\,x_{\\mathrm{N}_2} \\quad [\\text{MPa}] \\\\[6pt]
T_{c,\\mathrm{mix}} &= 304.13\\,x_{\\mathrm{CO}_2} + 190.56\\,x_{\\mathrm{CH}_4} + 126.19\\,x_{\\mathrm{N}_2} \\quad [\\text{K}] \\\\[6pt]
P_r &= \\frac{P}{P_{c,\\mathrm{mix}}}, \\qquad T_r = \\frac{T}{T_{c,\\mathrm{mix}}}
\\end{aligned}`

const EQ_REGIME = `\\text{Regime} = \\begin{cases}
\\text{Supercritical} & \\text{if } P_r \\geq 1 \\text{ and } T_r \\geq 1 \\\\[4pt]
\\text{Near-critical} & \\text{if } \\left|P_r - 1\\right| \\leq 0.02 \\text{ or } \\left|T_r - 1\\right| \\leq 0.02 \\\\[4pt]
\\text{Subcritical} & \\text{otherwise}
\\end{cases}`

const EQ_HINGE = `h^{+}(u,\\;k) = \\max(0,\\;u - k), \\qquad h^{-}(u,\\;k) = \\max(0,\\;k - u)`

// Subcritical MARS — 18 active terms (scaled variables: p, t, d, m, b, c, n)
const EQ_SUB_MARS = `\\begin{aligned}
\\hat{\\gamma}_{\\mathrm{sub}} ={}&
  51.6236 \\\\[2pt]
{}+{}& 17.9632\\; h^{+}(\\tilde{d},\\;0.0282) \\\\
{}+{}& 275.259\\; h^{-}(\\tilde{d},\\;0.0282) \\\\
{}+{}& 26.5844\\; h^{+}(\\tilde{P}_r,\\;{-}0.7198) \\\\
{}+{}& 26.138\\; h^{-}(\\tilde{P}_r,\\;{-}0.7198) \\\\
{-}{}& 20.2105\\; h^{+}(\\tilde{T}_r,\\;{-}0.3956) \\\\
{}+{}& 12.776\\; h^{-}(\\tilde{T}_r,\\;{-}0.3956) \\\\
{-}{}& 51.1174\\; h^{-}(\\tilde{P}_r,\\;{-}0.7198)\\cdot h^{+}(\\tilde{T}_r,\\;{-}0.518) \\\\
{}+{}& 137.846\\; h^{-}(\\tilde{P}_r,\\;{-}0.7198)\\cdot h^{-}(\\tilde{T}_r,\\;{-}0.518) \\\\
{-}{}& 55.2389\\; h^{+}(\\tilde{P}_r,\\;{-}0.7198)\\cdot h^{+}(\\tilde{d},\\;{-}0.7039) \\\\
{-}{}& 97.8475\\; h^{+}(\\tilde{P}_r,\\;{-}0.7198)\\cdot h^{-}(\\tilde{d},\\;{-}0.7039) \\\\
{}+{}& 66.6219\\; h^{+}(\\tilde{T}_r,\\;{-}0.516)\\cdot h^{+}(\\tilde{d},\\;0.0282) \\\\
{}+{}& 283.624\\; h^{-}(\\tilde{d},\\;0.0282)\\cdot \\mathrm{CH4\\_bin} \\\\
{-}{}& 499.802\\; h^{+}(\\tilde{T}_r,\\;{-}0.8978)\\cdot h^{-}(\\tilde{d},\\;0.0282) \\\\
{-}{}& 45.0736\\; h^{-}(\\tilde{T}_r,\\;{-}0.8978)\\cdot h^{-}(\\tilde{d},\\;0.0282) \\\\
{}+{}& 38.3241\\; h^{-}(\\tilde{T}_r,\\;{-}0.3956)\\cdot \\tilde{c}
\\end{aligned}`

// Supercritical MARS — 34 active terms + intercept
const EQ_SUP_MARS_A = `\\begin{aligned}
\\hat{\\gamma}_{\\mathrm{sup}} ={}&
  221.147 \\\\[2pt]
{-}{}& 59.8927\\; h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 84.6131\\; h^{+}(\\tilde{n},\\;0.9652) \\\\
{-}{}& 32.9950\\; h^{-}(\\tilde{n},\\;0.9652) \\\\
{-}{}& 64.0876\\; h^{-}(\\tilde{c},\\;0.7966) \\\\
{}+{}& 3.4684\\; h^{+}(\\widetilde{\\mathrm{BCM}},\\;{-}0.64)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{-}{}& 8.4184\\; h^{-}(\\widetilde{\\mathrm{BCM}},\\;{-}0.64)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{-}{}& 1959.30\\; h^{+}(\\tilde{T}_r,\\;{-}0.5087)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 34.4304\\; h^{-}(\\tilde{T}_r,\\;{-}0.5087)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 3.1914\\; h^{+}(\\widetilde{\\mathrm{MCM}},\\;{-}0.802)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{-}{}& 8.6816\\; h^{-}(\\widetilde{\\mathrm{MCM}},\\;{-}0.802)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 4.2350\\; h^{+}(\\tilde{T}_r,\\;{-}0.7733)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{-}{}& 29.5554\\; h^{-}(\\tilde{T}_r,\\;{-}0.7733)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{}+{}& 31.1754\\; h^{+}(\\tilde{T}_r,\\;{-}0.7165)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 1733.77\\; h^{+}(\\tilde{T}_r,\\;{-}0.499)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 302.237\\; h^{+}(\\tilde{T}_r,\\;{-}0.5359)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 28.3565\\; h^{-}(\\tilde{P}_r,\\;{-}0.9628)\\cdot h^{-}(\\tilde{c},\\;0.7966) \\\\
{-}{}& 136.493\\; h^{+}(\\tilde{T}_r,\\;{-}0.437)\\cdot h^{-}(\\tilde{d},\\;0.4517)
\\end{aligned}`

const EQ_SUP_MARS_B = `\\begin{aligned}
{-}{}& 133.979\\; h^{-}(\\tilde{c},\\;0.7966)\\cdot h^{+}(\\tilde{n},\\;{-}0.3434) \\\\
{}+{}& 126.039\\; h^{-}(\\tilde{c},\\;0.7966)\\cdot h^{+}(\\tilde{n},\\;{-}0.3675) \\\\
{}+{}& 8.6252\\; \\widetilde{\\mathrm{BCM}}\\cdot h^{+}(\\tilde{d},\\;0.4517) \\\\
{-}{}& 13.5765\\; h^{+}(\\tilde{P}_r,\\;{-}0.8438)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{}+{}& 21.9898\\; h^{-}(\\tilde{P}_r,\\;{-}0.8438)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{-}{}& 20.8103\\; h^{+}(\\tilde{n},\\;0.2907)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 24.6178\\; h^{-}(\\tilde{n},\\;0.2907)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 24.9711\\; h^{+}(\\tilde{P}_r,\\;{-}0.7159) \\\\
{-}{}& 19.7154\\; h^{-}(\\tilde{P}_r,\\;{-}0.7159) \\\\
{}+{}& 2.3966\\; h^{+}(\\widetilde{\\mathrm{BCM}},\\;{-}0.982)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{}+{}& 68.8340\\; h^{-}(\\widetilde{\\mathrm{BCM}},\\;{-}0.982)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{}+{}& 3.7786\\; h^{+}(\\tilde{T}_r,\\;{-}0.3379)\\cdot h^{-}(\\tilde{c},\\;0.7966) \\\\
{}+{}& 5.3720\\; h^{-}(\\tilde{T}_r,\\;{-}0.3379)\\cdot h^{-}(\\tilde{c},\\;0.7966) \\\\
{-}{}& 31.8591\\; h^{+}(\\tilde{c},\\;{-}0.7551)\\cdot h^{-}(\\tilde{n},\\;0.9652) \\\\
{}+{}& 11.3604\\; h^{+}(\\tilde{c},\\;{-}0.5506)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{}+{}& 25.7311\\; h^{-}(\\tilde{c},\\;{-}0.5506)\\cdot h^{-}(\\tilde{d},\\;0.4517) \\\\
{-}{}& 133.286\\; h^{-}(\\tilde{P}_r,\\;{-}0.7159)\\cdot h^{-}(\\tilde{T}_r,\\;{-}0.9192)
\\end{aligned}`

const EQ_UQ = `\\begin{aligned}
\\hat{\\gamma}_{P_{10}} &= \\hat{\\gamma}_{P_{50}} - \\delta_{\\mathrm{base}} \\cdot \\psi \\\\[6pt]
\\hat{\\gamma}_{P_{90}} &= \\hat{\\gamma}_{P_{50}} + \\delta_{\\mathrm{base}} \\cdot \\psi \\\\[8pt]
\\delta_{\\mathrm{base}} &= \\begin{cases}
  2.44\\;\\text{mN/m} & \\text{(subcritical)} \\\\
  2.25\\;\\text{mN/m} & \\text{(supercritical)}
\\end{cases} \\\\[8pt]
\\psi &= \\begin{cases}
  1.00 & \\text{GREEN — within domain, standard conditions} \\\\
  3.41 & \\text{YELLOW — Na}_2\\text{SO}_4\\text{ or MCM} > 2.5\\;\\text{mol/kg} \\\\
  5.00 & \\text{RED — extrapolation (outside training domain)}
\\end{cases}
\\end{aligned}`

const EQ_EOS_CO2 = `\\begin{aligned}
B_0 &= 0.083 - \\frac{0.422}{T_r^{1.6}}, \\qquad
B_1 = 0.139 - \\frac{0.172}{T_r^{4.2}} \\\\[6pt]
Z &= \\max\\!\\left(0.2,\\; 1 + \\frac{(B_0 + \\omega_{\\mathrm{CO}_2}\\,B_1)\\,P_r}{T_r}\\right) \\\\[6pt]
\\rho_{\\mathrm{CO}_2} &= \\frac{P\\,M_{\\mathrm{CO}_2}}{Z\\,R\\,T}
\\end{aligned}`

const EQ_EOS_BRINE = `\\begin{aligned}
\\rho_w &= 1.0 - 1.2\\times10^{-4}\\,T_C - 3.6\\times10^{-6}\\,T_C^2 + 4.5\\times10^{-8}\\,T_C^3
         + 4.0\\times10^{-6}\\,P_{\\text{bar}} - 1.6\\times10^{-8}\\,P_{\\text{bar}}\\,T_C \\\\[6pt]
A(T_C) &= 0.668 + 4.4\\times10^{-4}\\,T_C - 1.04\\times10^{-6}\\,T_C^2 \\\\[4pt]
B(T_C) &= 3.26\\times10^{-2} - 1.25\\times10^{-4}\\,T_C \\\\[6pt]
\\rho_{\\mathrm{brine}} &= \\rho_w + 0.0585\\,A(T_C)\\,m - 0.0585\\,B(T_C)\\,m^2
\\end{aligned}`

const EQ_DRHO = `\\Delta\\rho = \\rho_{\\mathrm{brine}} - \\rho_{\\mathrm{CO}_2}, \\qquad \\tilde{d} = \\text{MinMax}\\bigl((\\Delta\\rho)^2\\bigr)`

// ─── Main component ───────────────────────────────────────────────────────────
export default function EquationsTab() {
  const [activeSection, setActiveSection] = useState('all')

  const cellStyle = {
    padding: '0.3rem 0.6rem',
    fontSize: '0.72rem',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  }
  const headStyle = {
    ...cellStyle,
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    fontWeight: 600,
  }

  return (
    <div className="card" style={{ maxWidth: 860, width: '100%' }}>
      <p className="card-title" style={{ marginBottom: '1.5rem' }}>
        Model Equations
      </p>

      {/* ── Section 1: Feature Scaling ── */}
      <Section title="1 · MinMax Feature Scaling">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          All seven input features are independently scaled to{' '}
          <InlineMath latex="[-1,\;1]" /> before entering the MARS models.
        </p>
        <EqBlock label="MinMax scaling" latex={EQ_SCALING} />

        {/* bounds tables */}
        <div className="bounds-grid">
          {[
            { label: 'Subcritical bounds', rows: BOUNDS_SUB },
            { label: 'Supercritical bounds', rows: BOUNDS_SUP },
          ].map(({ label, rows }) => (
            <div key={label} className="bounds-table-wrap">
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
                {label}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 220 }}>
                  <thead>
                    <tr>
                      {['Feature', 'Min', 'Max'].map(h => (
                        <th key={h} style={{ ...headStyle, textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([feat, mn, mx]) => (
                      <tr key={feat}>
                        <td style={cellStyle}><InlineMath latex={feat} /></td>
                        <td style={cellStyle}>{mn}</td>
                        <td style={cellStyle}>{mx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Variable legend */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
            Scaled variable notation used in MARS equations below
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Symbol', 'Description', 'Regime'].map(h => (
                  <th key={h} style={{ ...headStyle, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEGEND_ROWS.map(([sym, desc, reg]) => (
                <tr key={sym}>
                  <td style={cellStyle}><InlineMath latex={sym} /></td>
                  <td style={cellStyle}>{desc}</td>
                  <td style={cellStyle}>{reg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Section 2: Regime Detection ── */}
      <Section title="2 · Kay's Mixing Rule & Regime Detection">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Pseudo-critical properties for the CO₂-rich gas mixture are computed via Kay's mixing
          rule, then used to classify the thermodynamic regime.
        </p>
        <EqBlock label="Kay's mixing rule" latex={EQ_KAYS} />
        <EqBlock label="Regime classification" latex={EQ_REGIME} />
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
          Critical constants — CO₂: <InlineMath latex="P_c = 7.377\;\text{MPa},\;T_c = 304.13\;\text{K}" />{' '}
          · CH₄: <InlineMath latex="P_c = 4.600\;\text{MPa},\;T_c = 190.56\;\text{K}" />{' '}
          · N₂: <InlineMath latex="P_c = 3.390\;\text{MPa},\;T_c = 126.19\;\text{K}" />
        </p>
      </Section>

      {/* ── Section 3: MARS Hinge Functions ── */}
      <Section title="3 · MARS Hinge Basis Functions">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Multivariate Adaptive Regression Splines (MARS) build models from paired hinge
          functions. <InlineMath latex="k" /> denotes the knot location in scaled feature space,
          and <InlineMath latex="u" /> is the scaled feature value.
        </p>
        <EqBlock label="Hinge function pair" latex={EQ_HINGE} />
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Products of two hinge functions (interaction terms) capture non-linear feature
          interactions. All knots are located in <InlineMath latex="[-1,\;1]" />.
        </p>
      </Section>

      {/* ── Section 4: Subcritical MARS ── */}
      <Section title="4 · Subcritical MARS Model (Sub-MARS-16t)">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Applied when <InlineMath latex="P_r < 1" /> or <InlineMath latex="T_r < 1" />.
          Output <InlineMath latex="\hat{\gamma}_{\mathrm{sub}}" /> is in mN/m.
          Test nRMSE: 5.46 % · External validation nRMSE: 17.00 %.
        </p>
        <EqBlock
          label="Subcritical MARS — 15 active terms + intercept"
          latex={EQ_SUB_MARS}
          note=""
        />
      </Section>

      {/* ── Section 5: Supercritical MARS ── */}
      <Section title="5 · Supercritical MARS Model (Sup-MARS-35t)">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          Applied when <InlineMath latex="P_r \geq 1" /> and <InlineMath latex="T_r \geq 1" />.
          Output <InlineMath latex="\hat{\gamma}_{\mathrm{sup}}" /> is in mN/m.
          Test nRMSE: 5.60 % · External validation nRMSE: 5.62 %.
        </p>
        <div
          style={{
            background: 'var(--color-surface-2)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
            Supercritical MARS — terms 1–17 (continued below)
          </div>
          <BlockMath latex={EQ_SUP_MARS_A} />
        </div>
        <div
          style={{
            background: 'var(--color-surface-2)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
            Supercritical MARS — terms 18–34
          </div>
          <BlockMath latex={EQ_SUP_MARS_B} />
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.3rem', fontStyle: 'italic', textAlign: 'center' }}>
            All 35 terms (intercept + 34 active) from <InlineMath latex="global\_sup\_mars\_equation.json" />.
          </div>
        </div>
      </Section>

      {/* ── Section 6: Uncertainty Quantification ── */}
      <Section title="6 · Conformal Prediction & Uncertainty Quantification">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          80 % conformal prediction intervals are computed from the MARS point estimate
          <InlineMath latex="\hat{\gamma}_{P_{50}}" /> by scaling a regime-specific
          base half-width by the Uncertainty Interval Factor (UIF){' '}
          <InlineMath latex="\psi" />.
        </p>
        <EqBlock label="80% prediction interval" latex={EQ_UQ} />
      </Section>

      {/* ── Section 7: EOS Density Correlations ── */}
      <Section title="7 · Density Estimation (EOS Assist Panel)">
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          When <InlineMath latex="\Delta\rho" /> is estimated via the EOS Assist panel, CO₂
          density uses the Pitzer–Curl virial equation (gas phase) or a polynomial fit (dense
          phase), and brine density uses the Rowe-Chou (1970) correlation.
        </p>
        <EqBlock
          label="CO₂ density — Pitzer–Curl virial equation"
          latex={EQ_EOS_CO2}
          note="ω(CO₂) = 0.239, M(CO₂) = 0.04401 kg/mol, R = 8.314 J mol⁻¹ K⁻¹. For dense-phase CO₂ a clamped polynomial fit is used instead."
        />
        <EqBlock
          label="Brine density — Rowe-Chou (1970) correlation"
          latex={EQ_EOS_BRINE}
          note="T_C = T − 273.15 (°C), P_bar = P × 10 (bar), m = salinity (mol/kg)"
        />
        <EqBlock label="Density difference (model input)" latex={EQ_DRHO} />
      </Section>
    </div>
  )
}
