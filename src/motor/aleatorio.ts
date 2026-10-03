/**
 * Generador pseudoaleatorio determinista (mulberry32) cuya semilla vive en el estado,
 * para que el estado siga siendo serializable y aplicar() siga siendo puro.
 * Devuelve un número en [0, 1) y la semilla siguiente.
 */
export function siguienteAleatorio(semilla: number): [valor: number, semilla: number] {
  const siguiente = (semilla + 0x6d2b79f5) | 0
  let t = Math.imul(siguiente ^ (siguiente >>> 15), 1 | siguiente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, siguiente]
}
