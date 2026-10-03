import { describe, expect, it } from 'vitest'
import { accionesLegales, aplicar, crearPartida, vistaDeJugador } from './index'
import type { Bando, Carta, Estado, Jugador } from './index'

const rngFijo = () => 0

function nuevaPartida(): Estado {
  return crearPartida({ multiplicador: 4 }, rngFijo)
}

/** Partida recién creada con la apuesta mínima ya hecha por el jugador Esclavo (J2). */
function nuevaRonda(apuesta = 1): Estado {
  return aplicar(nuevaPartida(), { tipo: 'Apostar', jugador: 'J2', cantidad: apuesta })
}

function enfrentar(estado: Estado, cartaA: Carta, cartaB: Carta): Estado {
  const conA = aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J1', carta: cartaA })
  return aplicar(conA, { tipo: 'ElegirCarta', jugador: 'J2', carta: cartaB })
}

function jugadorCon(estado: Estado, bando: Bando): Jugador {
  return vistaDeJugador(estado, 'J1').bando === bando ? 'J1' : 'J2'
}

/** Juega una ronda completa desde la fase de apuesta: gana el bando indicado en el primer enfrentamiento. */
function jugarRonda(estado: Estado, gana: Bando, apuesta = 1): Estado {
  const emperador = jugadorCon(estado, 'Emperador')
  const esclavo = jugadorCon(estado, 'Esclavo')
  let siguiente = aplicar(estado, { tipo: 'Apostar', jugador: esclavo, cantidad: apuesta })
  siguiente = aplicar(siguiente, { tipo: 'ElegirCarta', jugador: emperador, carta: 'Emperador' })
  const cartaEsclavo: Carta = gana === 'Esclavo' ? 'Esclavo' : 'Ciudadano'
  return aplicar(siguiente, { tipo: 'ElegirCarta', jugador: esclavo, carta: cartaEsclavo })
}

function continuar(estado: Estado): Estado {
  return aplicar(estado, { tipo: 'ContinuarRonda' })
}

describe('reparto de manos', () => {
  it('el jugador Emperador recibe 1 carta Emperador y 4 Ciudadanos, el jugador Esclavo 1 carta Esclavo y 4 Ciudadanos', () => {
    const estado = nuevaRonda()

    const vistaA = vistaDeJugador(estado, 'J1')
    const vistaB = vistaDeJugador(estado, 'J2')

    expect(vistaA.bando).toBe('Emperador')
    expect([...vistaA.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Ciudadano', 'Emperador'])
    expect(vistaB.bando).toBe('Esclavo')
    expect([...vistaB.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Ciudadano', 'Esclavo'])
  })
})

describe('jerarquía de cartas', () => {
  it('la carta Emperador vence a la carta Ciudadano y gana el jugador Emperador', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Ciudadano')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('J1')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Ciudadano' }])
  })
  it('la carta Ciudadano vence a la carta Esclavo y gana el jugador Emperador', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Esclavo')

    const vista = vistaDeJugador(estado, 'J2')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('J1')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Esclavo', rival: 'Ciudadano' }])
  })
  it('la carta Esclavo vence a la carta Emperador y gana el jugador Esclavo', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Esclavo')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('J2')
    expect(vista.enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Esclavo' }])
  })
})

describe('enfrentamientos', () => {
  it('Ciudadano contra Ciudadano descarta ambas cartas y empieza otro enfrentamiento', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Ciudadano')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.fase).toBe('enfrentamientos')
    expect(vista.ganadorRonda).toBeNull()
    expect([...vista.mano].sort()).toEqual(['Ciudadano', 'Ciudadano', 'Ciudadano', 'Emperador'])
    expect(vistaDeJugador(estado, 'J2').mano).toHaveLength(4)
    expect(vista.enfrentamientos).toEqual([{ mia: 'Ciudadano', rival: 'Ciudadano' }])
  })

  it('la ronda sigue tras los descartes hasta que aparece una carta especial', () => {
    let estado = nuevaRonda()
    estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')
    estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')
    estado = enfrentar(estado, 'Ciudadano', 'Esclavo')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.fase).toBe('resultadoRonda')
    expect(vista.ganadorRonda).toBe('J1')
    expect(vista.enfrentamientos).toEqual([
      { mia: 'Ciudadano', rival: 'Ciudadano' },
      { mia: 'Ciudadano', rival: 'Ciudadano' },
      { mia: 'Ciudadano', rival: 'Esclavo' },
    ])
  })
})

describe('selección simultánea', () => {
  it('acepta las elecciones en cualquier orden y solo revela cuando están las dos', () => {
    const soloB = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Esclavo' })

    expect(vistaDeJugador(soloB, 'J1').enfrentamientos).toEqual([])
    expect(vistaDeJugador(soloB, 'J1').fase).toBe('enfrentamientos')

    const ambas = aplicar(soloB, { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Emperador' })

    expect(vistaDeJugador(ambas, 'J1').enfrentamientos).toEqual([{ mia: 'Emperador', rival: 'Esclavo' }])
    expect(vistaDeJugador(ambas, 'J1').ganadorRonda).toBe('J2')
  })

  it('rechaza sin cambiar el estado elegir una carta que no está en la mano', () => {
    const estado = nuevaRonda()

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Esclavo' })).toBe(estado)
    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Emperador' })).toBe(estado)
  })

  it('rechaza elegir una carta Ciudadano cuando ya no le quedan', () => {
    let estado = nuevaRonda()
    for (let i = 0; i < 4; i++) estado = enfrentar(estado, 'Ciudadano', 'Ciudadano')

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Ciudadano' })).toBe(estado)
  })

  it('rechaza una segunda elección del mismo jugador en el mismo enfrentamiento', () => {
    const estado = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Ciudadano' })

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Emperador' })).toBe(estado)
  })

  it('rechaza elegir carta cuando la ronda ya terminó', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Ciudadano')

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Ciudadano' })).toBe(estado)
  })
})

describe('acciones legales', () => {
  it('un jugador puede elegir cualquier tipo de carta de su mano mientras no haya elegido', () => {
    const estado = nuevaRonda()

    expect(accionesLegales(estado, 'J2')).toEqual(
      expect.arrayContaining([
        { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Esclavo' },
        { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Ciudadano' },
      ]),
    )
    expect(accionesLegales(estado, 'J2')).toHaveLength(2)

    const trasElegir = aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Ciudadano' })
    expect(accionesLegales(trasElegir, 'J2')).toEqual([])
  })

  it('cuando la ronda ya terminó la única acción legal es continuar', () => {
    const estado = enfrentar(nuevaRonda(), 'Emperador', 'Esclavo')

    expect(accionesLegales(estado, 'J1')).toEqual([{ tipo: 'ContinuarRonda' }])
    expect(accionesLegales(estado, 'J2')).toEqual([{ tipo: 'ContinuarRonda' }])
  })
})

describe('vista de jugador', () => {
  it('muestra cuántas cartas le quedan al rival', () => {
    const estado = enfrentar(nuevaRonda(), 'Ciudadano', 'Ciudadano')

    expect(vistaDeJugador(estado, 'J1').cartasRival).toBe(4)
  })

  it('indica que el rival ya eligió pero nunca qué carta eligió', () => {
    const rivalEligeEsclavo = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Esclavo' })
    const rivalEligeCiudadano = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'J2', carta: 'Ciudadano' })

    const vista = vistaDeJugador(rivalEligeEsclavo, 'J1')
    expect(vista.rivalHaElegido).toBe(true)
    expect(vista.cartasRival).toBe(5)
    expect(vista).toEqual(vistaDeJugador(rivalEligeCiudadano, 'J1'))
  })

  it('muestra al jugador su propia carta elegida aún no revelada', () => {
    const estado = aplicar(nuevaRonda(), { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Emperador' })

    expect(vistaDeJugador(estado, 'J1').miEleccion).toBe('Emperador')
    expect(vistaDeJugador(estado, 'J2').rivalHaElegido).toBe(true)
    expect(vistaDeJugador(estado, 'J2').miEleccion).toBeNull()
  })
})

describe('apuesta', () => {
  it('la partida empieza en la fase de apuesta con 30 fichas para cada jugador', () => {
    const vista = vistaDeJugador(nuevaPartida(), 'J1')

    expect(vista.fase).toBe('apuesta')
    expect(vista.misFichas).toBe(30)
    expect(vista.fichasRival).toBe(30)
    expect(vista.apuesta).toBeNull()
  })

  it('no se puede elegir carta antes de que exista la apuesta', () => {
    const estado = nuevaPartida()

    expect(aplicar(estado, { tipo: 'ElegirCarta', jugador: 'J1', carta: 'Emperador' })).toBe(estado)
    expect(accionesLegales(estado, 'J1')).toEqual([])
  })

  it('al apostar el jugador Esclavo empiezan los enfrentamientos y ambos ven la apuesta', () => {
    const estado = aplicar(nuevaPartida(), { tipo: 'Apostar', jugador: 'J2', cantidad: 7 })

    expect(vistaDeJugador(estado, 'J1').fase).toBe('enfrentamientos')
    expect(vistaDeJugador(estado, 'J1').apuesta).toBe(7)
    expect(vistaDeJugador(estado, 'J2').apuesta).toBe(7)
  })
})

describe('límites de apuesta', () => {
  it('rechaza apuestas fuera de 1–10 y que apueste el jugador Emperador', () => {
    const estado = nuevaPartida()

    for (const cantidad of [0, -1, 11, 2.5]) {
      expect(aplicar(estado, { tipo: 'Apostar', jugador: 'J2', cantidad })).toBe(estado)
    }
    expect(aplicar(estado, { tipo: 'Apostar', jugador: 'J1', cantidad: 5 })).toBe(estado)
  })

  it('rechaza una segunda apuesta cuando ya empezaron los enfrentamientos', () => {
    const estado = nuevaRonda(3)

    expect(aplicar(estado, { tipo: 'Apostar', jugador: 'J2', cantidad: 5 })).toBe(estado)
  })
})

describe('pago', () => {
  it('si gana el jugador Emperador, el jugador Esclavo le paga la apuesta ×1', () => {
    const estado = enfrentar(nuevaRonda(6), 'Ciudadano', 'Esclavo')

    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(36)
    expect(vistaDeJugador(estado, 'J2').misFichas).toBe(24)
    expect(vistaDeJugador(estado, 'J1').pago).toBe(6)
  })

  it('si gana el jugador Esclavo, el jugador Emperador le paga la apuesta × el multiplicador', () => {
    const estado = enfrentar(nuevaRonda(3), 'Emperador', 'Esclavo')

    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(18)
    expect(vistaDeJugador(estado, 'J2').misFichas).toBe(42)
    expect(vistaDeJugador(estado, 'J2').pago).toBe(12)
  })

  it('con multiplicador ×5 el jugador Emperador paga la apuesta ×5', () => {
    const partida = crearPartida({ multiplicador: 5 }, rngFijo)
    const estado = enfrentar(aplicar(partida, { tipo: 'Apostar', jugador: 'J2', cantidad: 4 }), 'Emperador', 'Esclavo')

    expect(vistaDeJugador(estado, 'J2').misFichas).toBe(50)
    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(10)
  })

  it('los descartes de Ciudadanos no mueven fichas', () => {
    const estado = enfrentar(nuevaRonda(6), 'Ciudadano', 'Ciudadano')

    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(30)
    expect(vistaDeJugador(estado, 'J1').pago).toBeNull()
  })
})

describe('derrota por fichas', () => {
  it('si el perdedor no puede cubrir el pago entrega todas sus fichas y pierde la partida', () => {
    // 10 × 4 = 40 fichas, pero el jugador Emperador solo tiene 30.
    const estado = enfrentar(nuevaRonda(10), 'Emperador', 'Esclavo')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.misFichas).toBe(0)
    expect(vista.fichasRival).toBe(60)
    expect(vista.pago).toBe(30)
    expect(vista.resultado).toEqual({ ganador: 'J2', motivo: 'pagoNoCubierto' })
  })

  it('quedarse con exactamente 0 fichas tras un pago es derrota inmediata', () => {
    // 6 × 5 = 30 fichas: el jugador Emperador paga justo todo lo que tiene.
    const partida = crearPartida({ multiplicador: 5 }, rngFijo)
    const estado = enfrentar(aplicar(partida, { tipo: 'Apostar', jugador: 'J2', cantidad: 6 }), 'Emperador', 'Esclavo')

    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(0)
    expect(vistaDeJugador(estado, 'J2').resultado).toEqual({ ganador: 'J2', motivo: 'sinFichas' })
  })

  it('mientras nadie se quede sin fichas la partida no tiene resultado', () => {
    const estado = enfrentar(nuevaRonda(5), 'Emperador', 'Esclavo')

    expect(vistaDeJugador(estado, 'J1').resultado).toBeNull()
  })
})

describe('sorteo del jugador A', () => {
  it('el rng decide de forma determinista qué asiento es el jugador A, que empieza de Emperador', () => {
    const conRngBajo = crearPartida({ multiplicador: 4 }, () => 0.1)
    const conRngAlto = crearPartida({ multiplicador: 4 }, () => 0.9)

    expect(vistaDeJugador(conRngBajo, 'J1').jugadorA).toBe('J1')
    expect(vistaDeJugador(conRngBajo, 'J1').bando).toBe('Emperador')
    expect(vistaDeJugador(conRngAlto, 'J1').jugadorA).toBe('J2')
    expect(vistaDeJugador(conRngAlto, 'J2').bando).toBe('Emperador')
    expect(vistaDeJugador(conRngAlto, 'J1').bando).toBe('Esclavo')
    expect(accionesLegales(conRngAlto, 'J1')).toHaveLength(10)
  })
})

describe('rondas y bloques', () => {
  it('tras el resultado de una ronda no empieza la siguiente sin ContinuarRonda', () => {
    const terminada = jugarRonda(nuevaPartida(), 'Emperador')

    expect(aplicar(terminada, { tipo: 'Apostar', jugador: 'J2', cantidad: 1 })).toBe(terminada)
    expect(vistaDeJugador(terminada, 'J1').ronda).toBe(1)

    const siguiente = continuar(terminada)
    const vista = vistaDeJugador(siguiente, 'J1')
    expect(vista.ronda).toBe(2)
    expect(vista.fase).toBe('apuesta')
    expect(vista.apuesta).toBeNull()
    expect(vista.pago).toBeNull()
    expect(vista.ganadorRonda).toBeNull()
    expect(vista.enfrentamientos).toEqual([])
    expect(vista.mano).toHaveLength(5)
    expect(vista.cartasRival).toBe(5)
    expect(vista.misFichas).toBe(31)
  })

  it('ContinuarRonda se rechaza mientras la ronda no ha terminado', () => {
    const partida = nuevaPartida()
    const enJuego = nuevaRonda()

    expect(continuar(partida)).toBe(partida)
    expect(continuar(enJuego)).toBe(enJuego)
  })

  it('el jugador A es Emperador en las rondas 1–3 y 7–9, y el B en las 4–6 y 10–12', () => {
    let estado = nuevaPartida()
    const bandosDeA: Bando[] = []
    const rondas: [number, number][] = []
    for (let i = 0; i < 12; i++) {
      const vista = vistaDeJugador(estado, 'J1')
      bandosDeA.push(vista.bando)
      rondas.push([vista.ronda, vista.bloque])
      estado = continuar(jugarRonda(estado, 'Emperador'))
    }

    const E = 'Emperador'
    const S = 'Esclavo'
    expect(bandosDeA).toEqual([E, E, E, S, S, S, E, E, E, S, S, S])
    expect(rondas).toEqual([
      [1, 1], [2, 1], [3, 1], [4, 2], [5, 2], [6, 2],
      [7, 3], [8, 3], [9, 3], [10, 4], [11, 4], [12, 4],
    ])
  })

  it('el jugador Esclavo no puede apostar más fichas de las que tiene', () => {
    // El jugador A (J1) pierde tres rondas como Emperador pagando 2 × 4 = 8 cada vez: le quedan 6.
    let estado = nuevaPartida()
    for (let i = 0; i < 3; i++) estado = continuar(jugarRonda(estado, 'Esclavo', 2))

    expect(vistaDeJugador(estado, 'J1').bando).toBe('Esclavo')
    expect(vistaDeJugador(estado, 'J1').misFichas).toBe(6)
    expect(vistaDeJugador(estado, 'J1').apuestaMaxima).toBe(6)
    expect(aplicar(estado, { tipo: 'Apostar', jugador: 'J1', cantidad: 7 })).toBe(estado)
    expect(vistaDeJugador(aplicar(estado, { tipo: 'Apostar', jugador: 'J1', cantidad: 6 }), 'J1').apuesta).toBe(6)
  })
})

describe('fin de partida', () => {
  it('tras la ronda 12 gana quien tiene más fichas', () => {
    // Ronda 1: gana el jugador Esclavo (J2 cobra 4). Después gana siempre el jugador Emperador apostando 1.
    let estado = jugarRonda(nuevaPartida(), 'Esclavo')
    for (let ronda = 2; ronda <= 12; ronda++) estado = jugarRonda(continuar(estado), 'Emperador')

    const vista = vistaDeJugador(estado, 'J1')
    expect(vista.ronda).toBe(12)
    expect(vista.misFichas).toBe(25)
    expect(vista.fichasRival).toBe(35)
    expect(vista.resultado).toEqual({ ganador: 'J2', motivo: 'finDeRondas' })

    const final = continuar(estado)
    expect(vistaDeJugador(final, 'J1').fase).toBe('finPartida')
    expect(accionesLegales(final, 'J1')).toEqual([])
    expect(accionesLegales(final, 'J2')).toEqual([])
  })

  it('antes de la ronda 12 la partida sigue aunque alguien vaya por delante', () => {
    const estado = jugarRonda(nuevaPartida(), 'Esclavo')

    expect(vistaDeJugador(estado, 'J1').resultado).toBeNull()
  })

  it('la partida termina antes de tiempo si alguien se queda sin fichas', () => {
    const sinFichas = jugarRonda(nuevaPartida(), 'Esclavo', 10)

    const final = continuar(sinFichas)
    const vista = vistaDeJugador(final, 'J2')
    expect(vista.fase).toBe('finPartida')
    expect(vista.ronda).toBe(1)
    expect(vista.resultado).toEqual({ ganador: 'J2', motivo: 'pagoNoCubierto' })
    expect(accionesLegales(final, 'J2')).toEqual([])
  })
})
