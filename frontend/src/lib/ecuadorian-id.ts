/** Mismo algoritmo que EcuadorianId.java: provincia, tercer dígito y dígito verificador módulo 10. */
export function isValidCedula(value: string) {
  if (!/^\d{10}$/.test(value)) return false
  const province = Number(value.slice(0, 2))
  if (province < 1 || (province > 24 && province !== 30)) return false
  if (Number(value[2]) > 5) return false
  let total = 0
  for (let index = 0; index < 9; index++) {
    let digit = Number(value[index])
    if (index % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    total += digit
  }
  return (10 - (total % 10)) % 10 === Number(value[9])
}

/** Código dactilar del reverso de la cédula: letra, cuatro dígitos, letra, cuatro dígitos (V4443V4442). */
export function normalizeFingerprintCode(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z]\d{4}[A-Z]\d{4}$/.test(compact) ? compact : null
}
