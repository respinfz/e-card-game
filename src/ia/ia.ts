import type { Accion, Bando, Carta, Rng, VistaDeJugador } from '../motor'

/**
 * Probabilidad de jugar la carta especial según las cartas que le quedan (índice = cartas).
 * El jugador Emperador se arriesga algo antes que el jugador Esclavo; con la última carta no hay elección.
 */
const PROBABILIDAD_ESPECIAL: Record<Bando, readonly number[]> = {
  Emperador: [0, 1, 0.55, 0.38, 0.27, 0.2],
  Esclavo: [0, 1, 0.5, 0.33, 0.22, 0.15],
}

const CARTA_ESPECIAL: Record<Bando, Carta> = { Emperador: 'Emperador', Esclavo: 'Esclavo' }

/**
 * Decide la acción de la IA a partir de lo que ve su jugador, o devuelve null si no le toca actuar.
 * Solo ve la vista de jugador, nunca el estado completo.
 */
export function decidir(vista: VistaDeJugador, rng: Rng): Accion | null {
  if (vista.apuestaMaxima !== null) {
    return { tipo: 'Apostar', jugador: vista.jugador, cantidad: elegirApuesta(vista, vista.apuestaMaxima, rng) }
  }
  if (vista.fase !== 'enfrentamientos' || vista.miEleccion !== null) return null
  return { tipo: 'ElegirCarta', jugador: vista.jugador, carta: elegirCarta(vista, rng) }
}

function elegirCarta(vista: VistaDeJugador, rng: Rng): Carta {
  const especial = CARTA_ESPECIAL[vista.bando]
  if (!vista.mano.includes(especial)) return vista.mano[0]
  const probabilidad = PROBABILIDAD_ESPECIAL[vista.bando][vista.mano.length] ?? 1
  if (rng() < probabilidad || !vista.mano.includes('Ciudadano')) return especial
  return 'Ciudadano'
}

/**
 * Apuesta más cuanto peor van las fichas: con la partida igualada, alrededor de un tercio del máximo;
 * muy por detrás, casi el máximo; muy por delante, lo mínimo. El rng añade variación de ±50 %.
 */
function elegirApuesta(vista: VistaDeJugador, maxima: number, rng: Rng): number {
  const diferencia = vista.misFichas - vista.fichasRival
  const riesgo = Math.min(0.9, Math.max(0.1, 0.35 - diferencia / 60))
  const cantidad = Math.round(riesgo * maxima * (0.5 + rng()))
  return Math.min(maxima, Math.max(1, cantidad))
}
