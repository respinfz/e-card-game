import { describe, expect, it } from 'vitest'
import { accionesLegales, aplicar, crearPartida, vistaDeJugador } from '../motor'
import type { Estado, Jugador, Rng, VistaDeJugador } from '../motor'
import { rngConSemilla } from '../pruebas/rngConSemilla'
import { decidir } from './ia'

const JUGADORES: Jugador[] = ['J1', 'J2']

/**
 * Un paso de una partida IA contra IA: cada jugador decide sobre su vista y,
 * si nadie tiene nada que hacer al terminar la ronda, se continúa.
 * Llama a comprobar con cada vista y la acción decidida antes de aplicarla.
 */
function paso(estado: Estado, rng: Rng, comprobar: (estado: Estado, jugador: Jugador, vista: VistaDeJugador) => void) {
  let siguiente = estado
  for (const jugador of JUGADORES) {
    const vista = vistaDeJugador(siguiente, jugador)
    comprobar(siguiente, jugador, vista)
    const accion = decidir(vista, rng)
    if (accion) siguiente = aplicar(siguiente, accion)
  }
  if (vistaDeJugador(siguiente, 'J1').fase === 'resultadoRonda') {
    siguiente = aplicar(siguiente, { tipo: 'ContinuarRonda' })
  }
  return siguiente
}

function jugarPartida(semilla: number, comprobar: Parameters<typeof paso>[2] = () => {}): Estado {
  const rng = rngConSemilla(semilla)
  let estado = crearPartida({ multiplicador: semilla % 2 === 0 ? 4 : 5 }, rng)
  for (let i = 0; i < 1000 && vistaDeJugador(estado, 'J1').fase !== 'finPartida'; i++) {
    estado = paso(estado, rng, comprobar)
  }
  return estado
}

describe('IA', () => {
  it('en cualquier vista alcanzable devuelve una acción legal cuando le toca actuar', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      jugarPartida(semilla, (estado, jugador, vista) => {
        const rng = rngConSemilla(semilla * 1000 + vista.ronda)
        const accion = decidir(vista, rng)
        const legales = accionesLegales(estado, jugador).filter((legal) => legal.tipo !== 'ContinuarRonda')
        if (legales.length === 0) expect(accion).toBeNull()
        else expect(legales).toContainEqual(accion)
      })
    }
  })

  it('una partida completa IA contra IA termina con un ganador válido', () => {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const final = jugarPartida(semilla)

      const vista = vistaDeJugador(final, 'J1')
      expect(vista.fase).toBe('finPartida')
      expect(vista.resultado).not.toBeNull()
      expect(vista.misFichas + vista.fichasRival).toBe(60)
      const { ganador, motivo } = vista.resultado!
      const fichasGanador = ganador === 'J1' ? vista.misFichas : vista.fichasRival
      const fichasPerdedor = ganador === 'J1' ? vista.fichasRival : vista.misFichas
      if (motivo === 'finDeRondas') expect(fichasGanador).toBeGreaterThan(fichasPerdedor)
      else expect(fichasPerdedor).toBe(0)
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

describe('apuesta de la IA', () => {
  /** Vista del jugador Esclavo al empezar la partida (con rng 0 el jugador A es J1). */
  const vistaEsclavo = vistaDeJugador(crearPartida({ multiplicador: 4 }, () => 0), 'J2')

  function apuestaCon(vista: VistaDeJugador, valor: number): number {
    const accion = decidir(vista, () => valor)
    expect(accion?.tipo).toBe('Apostar')
    return accion?.tipo === 'Apostar' ? accion.cantidad : NaN
  }

  it('respeta 1–min(10, sus fichas)', () => {
    const conPocasFichas: VistaDeJugador = { ...vistaEsclavo, misFichas: 4, fichasRival: 56, apuestaMaxima: 4 }
    for (let i = 0; i < 100; i++) {
      const valor = i / 100
      const apuesta = apuestaCon(vistaEsclavo, valor)
      expect(apuesta).toBeGreaterThanOrEqual(1)
      expect(apuesta).toBeLessThanOrEqual(10)
      expect(Number.isInteger(apuesta)).toBe(true)
      const apuestaCorta = apuestaCon(conPocasFichas, valor)
      expect(apuestaCorta).toBeGreaterThanOrEqual(1)
      expect(apuestaCorta).toBeLessThanOrEqual(4)
    }
  })

  it('a igualdad de lo demás apuesta más cuando va perdiendo', () => {
    const perdiendo: VistaDeJugador = { ...vistaEsclavo, misFichas: 15, fichasRival: 45 }
    const ganando: VistaDeJugador = { ...vistaEsclavo, misFichas: 45, fichasRival: 15 }

    let sumaPerdiendo = 0
    let sumaGanando = 0
    for (let i = 0; i < 100; i++) {
      const valor = i / 100
      const conPerdida = apuestaCon(perdiendo, valor)
      const conVentaja = apuestaCon(ganando, valor)
      expect(conPerdida).toBeGreaterThanOrEqual(conVentaja)
      sumaPerdiendo += conPerdida
      sumaGanando += conVentaja
    }
    expect(sumaPerdiendo).toBeGreaterThan(sumaGanando)
  })
})

describe('carta especial de la IA', () => {
  it('la probabilidad de jugar la carta especial crece al quedarle menos cartas', () => {
    /** Fracción de valores del rng con los que juega la carta especial teniendo n cartas. */
    function frecuenciaEspecial(cartas: number): number {
      const base = vistaDeJugador(crearPartida({ multiplicador: 4 }, () => 0), 'J1')
      const vista: VistaDeJugador = {
        ...base,
        fase: 'enfrentamientos',
        apuesta: 1,
        apuestaMaxima: null,
        mano: ['Emperador', ...Array<'Ciudadano'>(cartas - 1).fill('Ciudadano')],
      }
      let especiales = 0
      for (let i = 0; i < 100; i++) {
        const accion = decidir(vista, () => i / 100)
        if (accion?.tipo === 'ElegirCarta' && accion.carta === 'Emperador') especiales++
      }
      return especiales / 100
    }

    const frecuencias = [5, 4, 3, 2, 1].map(frecuenciaEspecial)
    expect(frecuencias[0]).toBeGreaterThan(0)
    for (let i = 1; i < frecuencias.length; i++) expect(frecuencias[i]).toBeGreaterThan(frecuencias[i - 1])
    expect(frecuencias.at(-1)).toBe(1)
  })
})
