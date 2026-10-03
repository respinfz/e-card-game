import { describe, expect, it } from 'vitest'
import { accionesLegales, aplicar, crearPartida, vistaDeJugador } from '../motor'
import type { Jugador } from '../motor'
import { decidir } from './ia'

/** Generador pseudoaleatorio determinista (mulberry32). */
function rngConSemilla(semilla: number) {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('IA aleatoria', () => {
  it('en una ronda IA contra IA siempre elige una carta legal y la ronda termina con un ganador', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const rng = rngConSemilla(semilla)
      let estado = crearPartida({ multiplicador: 4 }, rng)

      for (let paso = 0; paso < 10 && vistaDeJugador(estado, 'A').fase === 'enfrentamientos'; paso++) {
        for (const jugador of ['A', 'B'] as Jugador[]) {
          const accion = decidir(vistaDeJugador(estado, jugador), rng)
          expect(accionesLegales(estado, jugador)).toContainEqual(accion)
          estado = aplicar(estado, accion!)
        }
      }

      expect(vistaDeJugador(estado, 'A').fase).toBe('resultadoRonda')
      expect(['A', 'B']).toContain(vistaDeJugador(estado, 'A').ganadorRonda)
    }
  })

  it('no decide nada cuando ya eligió carta en el enfrentamiento', () => {
    const estado = aplicar(crearPartida({ multiplicador: 4 }, () => 0), {
      tipo: 'ElegirCarta',
      jugador: 'B',
      carta: 'Ciudadano',
    })

    expect(decidir(vistaDeJugador(estado, 'B'), () => 0)).toBeNull()
  })
})
