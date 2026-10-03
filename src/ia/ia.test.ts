import { describe, expect, it } from 'vitest'
import { accionesLegales, aplicar, crearPartida, vistaDeJugador } from '../motor'
import type { Jugador } from '../motor'
import { rngConSemilla } from '../pruebas/rngConSemilla'
import { decidir } from './ia'

describe('IA aleatoria', () => {
  it('en una ronda IA contra IA siempre elige una carta legal y la ronda termina con un ganador', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const rng = rngConSemilla(semilla)
      let estado = crearPartida({ multiplicador: 4 }, rng)
      const esclavo: Jugador = vistaDeJugador(estado, 'J1').bando === 'Esclavo' ? 'J1' : 'J2'
      const emperador: Jugador = esclavo === 'J1' ? 'J2' : 'J1'
      const apuesta = decidir(vistaDeJugador(estado, esclavo), rng)
      expect(accionesLegales(estado, esclavo)).toContainEqual(apuesta)
      expect(decidir(vistaDeJugador(estado, emperador), rng)).toBeNull()
      estado = aplicar(estado, apuesta!)

      for (let paso = 0; paso < 10 && vistaDeJugador(estado, 'J1').fase === 'enfrentamientos'; paso++) {
        for (const jugador of ['J1', 'J2'] as Jugador[]) {
          const accion = decidir(vistaDeJugador(estado, jugador), rng)
          expect(accionesLegales(estado, jugador)).toContainEqual(accion)
          estado = aplicar(estado, accion!)
        }
      }

      expect(vistaDeJugador(estado, 'J1').fase).toBe('resultadoRonda')
      expect(['J1', 'J2']).toContain(vistaDeJugador(estado, 'J1').ganadorRonda)
    }
  })

  it('no decide nada cuando ya eligió carta en el enfrentamiento', () => {
    const partida = crearPartida({ multiplicador: 4 }, () => 0)
    const estado = aplicar(aplicar(partida, { tipo: 'Apostar', jugador: 'J2', cantidad: 1 }), {
      tipo: 'ElegirCarta',
      jugador: 'J2',
      carta: 'Ciudadano',
    })

    expect(decidir(vistaDeJugador(estado, 'J2'), () => 0)).toBeNull()
  })
})
