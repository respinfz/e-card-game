import type { Accion, Rng, VistaDeJugador } from '../motor'

/**
 * Decide la acción de la IA a partir de lo que ve su jugador.
 * Elige al azar una carta de su mano, o null si no le toca actuar.
 */
export function decidir(vista: VistaDeJugador, rng: Rng): Accion | null {
  if (vista.fase !== 'enfrentamientos' || vista.miEleccion !== null) return null
  const carta = vista.mano[Math.floor(rng() * vista.mano.length)]
  return { tipo: 'ElegirCarta', jugador: vista.jugador, carta }
}
