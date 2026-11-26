import React from 'react'
import { cleanScientificText, tokenizeRichScientific } from '../logic/formatText.js'

/**
 * Renders scientific prose with real HTML <sub> and <sup> elements
 * (e.g., r_c -> r<sub>c</sub>, γ_P90 -> γ<sub>P90</sub>, UIF_interval -> UIF<sub>interval</sub>).
 */
export default function RichScientificText({ text }) {
  if (!text) return null
  const tokens = tokenizeRichScientific(cleanScientificText(String(text)))
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === 'sub') return <sub key={i}>{tok.value}</sub>
        if (tok.type === 'sup') return <sup key={i}>{tok.value}</sup>
        return <React.Fragment key={i}>{tok.value}</React.Fragment>
      })}
    </>
  )
}
