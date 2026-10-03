import type { Rng } from '../motor'
import { siguienteAleatorio } from '../motor/aleatorio'

/** Rng determinista para los tests, con el mismo generador que usa el motor. */
export function rngConSemilla(semilla: number): Rng {
  let actual = semilla
  return () => {
    const [valor, siguiente] = siguienteAleatorio(actual)
    actual = siguiente
    return valor
  }
}
