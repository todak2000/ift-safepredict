/**
 * Scientific & Executive Text Formatting Utilities
 * - Converts raw LaTeX (`$0.5232\text{ g/cm}^3$`) and Markdown (`**bold**` across newlines)
 *   into clean Unicode engineering prose.
 * - Tokenizes scientific underscore/caret notation (`r_c`, `γ_P90`, `ρ_CO₂`, `UIF_interval`, `H_cap`)
 *   into structured `{ type: 'text' | 'sub' | 'sup', value }` tokens for proper React `<sub>`/`<sup>` rendering.
 * - Produces clean, human-readable WinAnsi-safe prose for jsPDF reports (zero `dRho` / `r_c` / `**` clutter).
 */

export function cleanScientificText(input = '') {
  if (!input || typeof input !== 'string') return '';

  let s = input;

  const convertMathInner = (expr) =>
    expr
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\mathrm\{([^}]*)\}/g, '$1')
      .replace(/\\mathbf\{([^}]*)\}/g, '$1')
      .replace(/\\hat\{\\gamma\}_\{?50\}?/g, 'γ_P50')
      .replace(/\\hat\{\\gamma\}/g, 'γ')
      .replace(/\\Delta\s*\\rho/g, 'Δρ')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\rho_\{?\\text\{CO\}_?2\}?/gi, 'ρ_CO₂')
      .replace(/\\rho_\{?CO_?2\}?/gi, 'ρ_CO₂')
      .replace(/\\rho/g, 'ρ')
      .replace(/\\gamma/g, 'γ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\phi/g, 'φ')
      .replace(/\\sigma/g, 'σ')
      .replace(/\\mu/g, 'µ')
      .replace(/\\le\b|\\leq\b/g, '≤')
      .replace(/\\ge\b|\\geq\b/g, '≥')
      .replace(/\\times\b/g, '×')
      .replace(/\\pm\b/g, '±')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\in\b/g, '∈')
      .replace(/\\rightarrow\b|\\to\b/g, '→')
      .replace(/\\cdot\b/g, '·')
      .replace(/\^\\circ\s*C\b/g, ' °C')
      .replace(/\^\\circ/g, '°')
      .replace(/\\circ/g, '°')
      .replace(/CO_2\b/g, 'CO₂')
      .replace(/CH_4\b/g, 'CH₄')
      .replace(/N_2\b/g, 'N₂')
      .replace(/H_2O\b/g, 'H₂O')
      .replace(/Na_2SO_4\b/g, 'Na₂SO₄')
      .replace(/CaCl_2\b/g, 'CaCl₂')
      .replace(/MgCl_2\b/g, 'MgCl₂')
      .replace(/\^3\b/g, '³')
      .replace(/\^2\b/g, '²')
      .replace(/\\_/g, '_')
      .replace(/--/g, '–')
      .replace(/[{}]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  s = s.replace(/\$\$([^$]+)\$\$/g, (_, m) => convertMathInner(m));
  s = s.replace(/\$([^$\n]+)\$/g, (_, m) => convertMathInner(m));
  s = s.replace(/\\\(([^)]+)\\\)/g, (_, m) => convertMathInner(m));

  // Normalize multiline **bold** spans (where LLM broke a line inside **Heading:**) into a single line
  s = s.replace(/\*\*([^*\n]+)\s*\n+\s*([^*]+)\*\*/g, '**$1 $2**');

  s = s
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\Delta\\rho/g, 'Δρ')
    .replace(/\\le\b|\\leq\b/g, '≤')
    .replace(/\\ge\b|\\geq\b/g, '≥')
    .replace(/\^\\circ/g, '°')
    .replace(/\\_/g, '_')
    .replace(/\bCO2\b/g, 'CO₂')
    .replace(/\bCH4\b/g, 'CH₄')
    .replace(/\bNa2SO4\b/g, 'Na₂SO₄')
    .replace(/\bCaCl2\b/g, 'CaCl₂')
    .replace(/\bMgCl2\b/g, 'MgCl₂');

  return s;
}

/**
 * Tokenize scientific subscript/superscript expressions (e.g. `r_c`, `γ_P90`, `ρ_CO₂`,
 * `UIF_interval`, `H_cap`, `P_c`, `S_CO₂,max`, `Δρ^2`) into renderable inline parts
 * so React components render real `<sub>` and `<sup>` elements instead of raw underscores.
 */
const SUB_SUP_PATTERN =
  /\b(UIF|r|H|P|T|S|m|x|q)_(interval|cap|lit|tot|mix|eff|brine|CO₂,max|CO2,max|CO₂|CO2|CH₄|CH4|N₂|N2|P90|P50|P10|90|50|10|80|c|e|r)\b|(γ|ρ|σ|θ|φ)_(P90|P50|P10|lit|sub|sup|CO₂|CO2|brine|w|c)|(\b[A-Za-zΔγρ]+)\^([0-9+-]+)/g;

export function tokenizeRichScientific(text = '') {
  if (!text) return [];
  const tokens = [];
  let lastIndex = 0;
  let match;
  SUB_SUP_PATTERN.lastIndex = 0;

  while ((match = SUB_SUP_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) {
      tokens.push({ type: 'text', value: match[1] });
      tokens.push({
        type: 'sub',
        value: match[2].replace('CO2', 'CO₂').replace('CH4', 'CH₄').replace('N2', 'N₂'),
      });
    } else if (match[3] && match[4]) {
      tokens.push({ type: 'text', value: match[3] });
      tokens.push({
        type: 'sub',
        value: match[4].replace('CO2', 'CO₂'),
      });
    } else if (match[5] && match[6]) {
      tokens.push({ type: 'text', value: match[5] });
      tokens.push({ type: 'sup', value: match[6] });
    }
    lastIndex = SUB_SUP_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return tokens;
}

/**
 * Parse Markdown narrative into structured paragraphs / bullet items with bold + sub/sup segments.
 */
export function parseExecutiveBlocks(rawText = '') {
  const cleaned = cleanScientificText(rawText);
  const lines = cleaned
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const isBullet = /^[-*•]\s+/.test(line) || /^\d+\.\s+/.test(line);
    const isHeading = /^#{1,4}\s+/.test(line);
    const content = line
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^#{1,4}\s+/, '');

    const segments = [];
    const regex = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ bold: false, text: content.slice(lastIdx, match.index).replace(/\*\*/g, '') });
      }
      segments.push({ bold: true, text: match[1].replace(/\*\*/g, '') });
      lastIdx = regex.lastIndex;
    }
    if (lastIdx < content.length) {
      segments.push({ bold: false, text: content.slice(lastIdx).replace(/\*\*/g, '') });
    }

    return {
      type: isHeading ? 'heading' : isBullet ? 'bullet' : 'paragraph',
      segments,
      plainText: content.replace(/\*\*/g, ''),
    };
  });
}

/**
 * Convert engineering text into clean, executive-friendly WinAnsi (ISO-8859-1) prose for jsPDF.
 * Eliminates raw `**`, programmer underscores (`r_c`, `H_50`, `UIF_interval`, `dRho`), and non-WinAnsi glyphs.
 */
export function toPdfSafeText(input = '') {
  const cleaned = cleanScientificText(String(input ?? ''));
  return cleaned
    .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\br_c\b/g, 'rc')
    .replace(/\bP_c\b/g, 'Pc')
    .replace(/\bP_e\b/g, 'Pe')
    .replace(/\bH_cap\b/g, 'Hcap')
    .replace(/\bH_90\b/g, 'H90')
    .replace(/\bH_50\b/g, 'H50')
    .replace(/\bH_10\b/g, 'H10')
    .replace(/\bUIF_interval\b/g, 'Cross-Lab UIF')
    .replace(/ρ_CO₂|ρ_CO2|\brho_CO2\b/gi, 'CO2 Density')
    .replace(/\bdRho\b|Δρ/g, 'Density Contrast')
    .replace(/Δ/g, 'Delta ')
    .replace(/ρ/g, 'rho')
    .replace(/γ_P90/g, 'IFT P90')
    .replace(/γ_P50/g, 'IFT P50')
    .replace(/γ_P10/g, 'IFT P10')
    .replace(/γ_lit/g, 'Lit IFT')
    .replace(/γ/g, 'IFT')
    .replace(/θ/g, 'theta')
    .replace(/φ/g, 'porosity')
    .replace(/σ/g, 'IFT')
    .replace(/CO₂/g, 'CO2')
    .replace(/CH₄/g, 'CH4')
    .replace(/N₂/g, 'N2')
    .replace(/H₂O/g, 'H2O')
    .replace(/Na₂SO₄/g, 'Na2SO4')
    .replace(/CaCl₂/g, 'CaCl2')
    .replace(/MgCl₂/g, 'MgCl2')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9')
    .replace(/⁺/g, '+')
    .replace(/⁻/g, '-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≈/g, '~')
    .replace(/∈/g, 'in')
    .replace(/→/g, '->')
    .replace(/—/g, ' - ')
    .replace(/–/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
