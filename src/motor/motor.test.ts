import { describe, expect, it } from 'vitest'
import { accionesLegales, aplicar, crearPartida, vistaDeJugador } from './index'
import type { Carta, Estado } from './index'

const rngFijo = () => 0

function nuevaRonda(): Estado {
  return crearPartida({ multiplicador: 4 }, rngFijo)
}

function enfrentar(estado: Estado, cartaA: Carta, cartaB: Carta): Estado {
  const conA = aplicar(estado, { tipo: 'ElegirCarta', jugador: 'A', carta: cartaA })
  return aplicar(conA, { tipo: 'ElegirCarta', jugador: 'B', carta: cartaB })
}

describe('reparto de manos', () => {
  it('el jugador Emperador recibe 1 carta Emperador y 4 Ciudadanos, el jugador Esclavo 1 carta Esclavo y 4 Ciudadanos', () => {
    const estado = nuevaRonda()

    const vistaA = vistaDeJugador(estado, 'A')
    const vistaB = vistaDeJugador(estado, 'B')

    expect(vistaA.bando).toBe('Emperador')
    expect([...vistaA.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Ciudadano', 'Emperador'])
    expect(vistaB.bando).toBe('Esclavo')
    expect([...vistaB.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Ciudadano', 'Esclavo'])
  })
})

describe('jerarquía de cartas', () => {
  it('la carta Emperador vence a la carta Ciudadano y gana el jugador Emperador', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Ciudadano')

    const vista = vistaDeJugador(estado, 'A')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('A')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Ciudadano' }])
  })
  it('la carta Ciudadano vence a la carta Esclavo y gana el jugador Emperador', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Esclavo')

    const vista = vistaDeJugador(estado, 'B')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('A')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Esclavo', rival: 'Ciudadano' }])
  })
  it('la carta Esclavo vence a la carta Emperador y gana el jugador Esclavo', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Esclavo')

    const vista = vistaDeJugador(estado, 'A')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('B')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Esclavo' }])
  })
})

describe('enfrentamientos', () => {
  it('Ciudadano contra Ciudadano descarta ambas cartas y empieza otro enfrentamiento', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Ciudadano')

    const vista = vistaDeJugador(estado, 'A')
    expect(vista.fase).toBe('enfrentamientos')
    expect(vista.ganadorRonda).toBeNull()
    expect([...vista.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Emperador'])
    expect(vistaDeJugador(estado, 'B').mano).toHaveLength(4)
    expect(vista.enfrentamientos).toEqual([{ mia: 'Ciudadano', rival: 'Ciudadano' }])
  })

  it('la ronda sigue tras los descartes hasta que aparece una carta especial', () => {
    let estado = nuevaRonda()
    estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')
    estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')
    estado = enfrentar(estado, 'Ciudadano', 'Esclavo')

    const vista = vistaDeJugador(estado, 'A')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('A')
    expect(vista.enfrentamientos).toEqual([
      { mia: 'Ciudadano', rival: 'Ciudadano' },
      { mia: 'Ciudadano', rival: 'Ciudadano' },
      { mia: 'Ciudadano', rival: 'Esclavo' },
    ])
  })
})

describe('selección simultánea', () => {
  it('acepta las elecciones en cualquier orden y solo revela cuando están las dos', () => {
    const soloB = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'B', carta: 'Esclavo' })

    expect(vistaDeJugador(soloB, 'A').enfrentamientos).toEqual([])
    expect(vistaDeJugador(soloB, 'A').fase).toBe('enfrentamientos')

    const ambas = aplicar(soloB, { tipo: 'ElegirCarta', jugador: 'A', carta: 'Emperador' })

    expect(vistaDeJugador(ambas, 'A').enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Esclavo' }])
    expect(vistaDeJugador(ambas, 'A').ganadorRonda).toBe('B')
  })

  it('rechaza sin cambiar el estado elegir una carta que no está en la mano', () => {
    const estado = nuevaRonda()

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'A', carta: 'Esclavo' })).toBe(estado)
    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'B', carta: 'Emperador' })).toBe(estado)
  })

  it('rechaza elegir una carta Ciudadano cuando ya no le quedan', () => {
    let estado = nuevaRonda()
    for (let i = 0; i < 4; i++) estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'A', carta: 'Ciudadano' })).toBe(estado)
  })

  it('rechaza una segunda elección del mismo jugador en el mismo enfrentamiento', () => {
    const estado = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'A', carta: 'Ciudadano' })

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'A', carta: 'Emperador' })).toBe(estado)
  })

  it('rechaza elegir carta cuando la ronda ya terminó', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Ciudadano')

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'B', carta: 'Ciudadano' })).toBe(estado)
  })
})

describe('acciones legales', () => {
  it('un jugador puede elegir cualquier tipo de carta de su mano mientras no haya elegido', () => {
    const estado = nuevaRonda()

    expect(accionesLegales(estado, 'B')).toEqual(
      expect.arrayContaining([
        { tipo: 'ElegirCarta', jugador: 'B', carta: 'Esclavo' },
        { tipo: 'ElegirCarta', jugador: 'B', carta: 'Ciudadano' },
      ]),
    )
    expect(accionesLegales(estado, 'B')).toHaveLength(2)

    const trasElegir = aplicar(estado, { tipo: 'ElegirCarta', jugador: 'B', carta: 'Ciudadano' })
    expect(accionesLegales(trasElegir, 'B')).toEqual([])
  })

  it('nadie tiene acciones legales cuando la ronda ya terminó', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Esclavo')

    expect(accionesLegales(estado, 'A')).toEqual([])
    expect(accionesLegales(estado, 'B')).toEqual([])
  })
})

describe('vista de jugador', () => {
  it('muestra cuántas cartas le quedan al rival', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Ciudadano')

    expect(vistaDeJugador(estado, 'A').cartasRival).toBe(4)
  })

  it('indica que el rival ya eligió pero nunca qué carta eligió', () => {
    const rivalEligeEsclavo = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'B', carta: 'Esclavo' })
    const rivalEligeCiudadano = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'B', carta: 'Ciudadano' })

    const vista = vistaDeJugador(rivalEligeEsclavo, 'A')
    expect(vista.rivalHaElegido).toBe(true)
    expect(vista.cartasRival).toBe(5)
    expect(vista).toEqual(vistaDeJugador(rivalEligeCiudadano, 'A'))
  })

  it('muestra al jugador su propia carta elegida aún no revelada', () => {
    const estado = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'A', carta: 'Emperador' })

    expect(vistaDeJugador(estado, 'A').miEleccion).toBe('Emperador')
    expect(vistaDeJugador(estado, 'B').rivalHaElegido).toBe(true)
    expect(vistaDeJugador(estado, 'B').miEleccion).toBeNull()
  })
})
