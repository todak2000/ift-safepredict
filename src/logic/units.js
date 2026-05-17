export const PRESSURE_UNITS = [
  { id: 'MPa', label: 'MPa' },
  { id: 'bar', label: 'bar' },
  { id: 'psi', label: 'psi' },
]

export const TEMP_UNITS = [
  { id: 'K', label: 'K' },
  { id: 'C', label: '°C' },
  { id: 'F', label: '°F' },
]

export function pToSI(value, unit) {
  if (unit === 'bar') return value * 0.1
  if (unit === 'psi') return value * 0.00689476
  return value
}

export function pFromSI(value, unit) {
  if (unit === 'bar') return value * 10
  if (unit === 'psi') return value * 145.0377
  return value
}

export function tToSI(value, unit) {
  if (unit === 'C') return value + 273.15
  if (unit === 'F') return (value - 32) * 5 / 9 + 273.15
  return value
}

export function tFromSI(value, unit) {
  if (unit === 'C') return value - 273.15
  if (unit === 'F') return (value - 273.15) * 9 / 5 + 32
  return value
}

export function pLabel(unit) {
  if (unit === 'bar') return 'bar'
  if (unit === 'psi') return 'psi'
  return 'MPa'
}

export function tLabel(unit) {
  if (unit === 'C') return '°C'
  if (unit === 'F') return '°F'
  return 'K'
}

export function pMinMax(unit) {
  const min = pFromSI(0.1, unit)
  const max = pFromSI(60, unit)
  const step = unit === 'psi' ? 10 : unit === 'bar' ? 0.5 : 0.5
  return { min: +min.toFixed(2), max: +max.toFixed(1), step }
}

export function tMinMax(unit) {
  if (unit === 'C') return { min: 0, max: 227, step: 1 }
  if (unit === 'F') return { min: 32, max: 440, step: 1 }
  return { min: 273, max: 500, step: 1 }
}
