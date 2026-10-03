import type {
  Accion,
  Bando,
  Carta,
  Configuracion,
  Enfrentamiento,
  Estado,
  Jugador,
  Resultado,
  Rng,
  VistaDeJugador,
} from './tipos'

function bandoDe(jugador: Jugador): Bando {
  return jugador === 'A' ? 'Emperador' : 'Esclavo'
}

function rivalDe(jugador: Jugador): Jugador {
  return jugador === 'A' ? 'B' : 'A'
}

const CARTA_ESPECIAL: Record<Bando, Carta> = { Emperador: 'Emperador', Esclavo: 'Esclavo' }

function repartirMano(bando: Bando): Carta[] {
  return [CARTA_ESPECIAL[bando], 'Ciudadano', 'Ciudadano', 'Ciudadano', 'Ciudadano']
}

function quitarUna(mano: Carta[], carta: Carta): Carta[] {
  const indice = mano.indexOf(carta)
  return [...mano.slice(0, indice), ...mano.slice(indice + 1)]
}

const FICHAS_INICIALES = 30

export function crearPartida(configuracion: Configuracion, _rng: Rng): Estado {
  return {
    configuracion,
    fase: 'apuesta',
    fichas: { A: FICHAS_INICIALES, B: FICHAS_INICIALES },
    apuesta: null,
    manos: { A: repartirMano(bandoDe('A')), B: repartirMano(bandoDe('B')) },
    elecciones: {},
    enfrentamientos: [],
    ganadorRonda: null,
    pago: null,
    resultado: null,
  }
}

const VENCE_A: Record<Carta, Carta> = {
  Emperador: 'Ciudadano',
  Ciudadano: 'Esclavo',
  Esclavo: 'Emperador',
}

/** Ganador del enfrentamiento, o null si son dos Ciudadanos y se descartan. */
function ganadorDe(enfrentamiento: Enfrentamiento): Jugador | null {
  if (VENCE_A[enfrentamiento.A] === enfrentamiento.B) return 'A'
  if (VENCE_A[enfrentamiento.B] === enfrentamiento.A) return 'B'
  return null
}

function pagar(estado: Estado, ganador: Jugador): Estado {
  const perdedor = rivalDe(ganador)
  const factor = bandoDe(ganador) === 'Esclavo' ? estado.configuracion.multiplicador : 1
  const debe = estado.apuesta! * factor
  // Si el perdedor no puede cubrir el pago, entrega todo lo que tiene y pierde la partida.
  const pago = Math.min(debe, estado.fichas[perdedor])
  const fichas = { ...estado.fichas }
  fichas[ganador] += pago
  fichas[perdedor] -= pago
  let resultado: Resultado | null = null
  if (pago < debe) resultado = { ganador, motivo: 'pagoNoCubierto' }
  else if (fichas[perdedor] === 0) resultado = { ganador, motivo: 'sinFichas' }
  return { ...estado, fichas, pago, resultado }
}

function revelar(estado: Estado, enfrentamiento: Enfrentamiento): Estado {
  const ganador = ganadorDe(enfrentamiento)
  const revelado: Estado = {
    ...estado,
    fase: ganador === null ? 'enfrentamientos' : 'resultadoRonda',
    manos: {
      A: quitarUna(estado.manos.A, enfrentamiento.A),
      B: quitarUna(estado.manos.B, enfrentamiento.B),
    },
    elecciones: {},
    enfrentamientos: [...estado.enfrentamientos, enfrentamiento],
    ganadorRonda: ganador,
  }
  return ganador === null ? revelado : pagar(revelado, ganador)
}

const APUESTA_TOPE = 10

/** El jugador Esclavo apuesta de 1 a 10, sin superar sus propias fichas. */
function apuestaMaxima(estado: Estado): number {
  const esclavo = bandoDe('A') === 'Esclavo' ? 'A' : 'B'
  return Math.min(APUESTA_TOPE, estado.fichas[esclavo])
}

function leTocaApostar(estado: Estado, jugador: Jugador): boolean {
  return estado.fase === 'apuesta' && bandoDe(jugador) === 'Esclavo'
}

export function accionesLegales(estado: Estado, jugador: Jugador): Accion[] {
  if (estado.fase === 'apuesta') {
    if (!leTocaApostar(estado, jugador)) return []
    return Array.from({ length: apuestaMaxima(estado) }, (_, i) => ({ tipo: 'Apostar', jugador, cantidad: i + 1 }))
  }
  if (estado.fase !== 'enfrentamientos' || estado.elecciones[jugador] !== undefined) return []
  const cartasDistintas = [...new Set(estado.manos[jugador])]
  return cartasDistintas.map((carta) => ({ tipo: 'ElegirCarta', jugador, carta }))
}

function esLegal(estado: Estado, accion: Accion): boolean {
  return accionesLegales(estado, accion.jugador).some(
    (legal) => JSON.stringify(legal) === JSON.stringify(accion),
  )
}

/** Aplica la acción y devuelve el nuevo estado. Una acción ilegal devuelve el mismo estado. */
export function aplicar(estado: Estado, accion: Accion): Estado {
  if (!esLegal(estado, accion)) return estado
  if (accion.tipo === 'Apostar') return { ...estado, fase: 'enfrentamientos', apuesta: accion.cantidad }
  const elecciones = { ...estado.elecciones, [accion.jugador]: accion.carta }
  if (elecciones.A !== undefined && elecciones.B !== undefined) {
    return revelar(estado, { A: elecciones.A, B: elecciones.B })
  }
  return { ...estado, elecciones }
}

export function vistaDeJugador(estado: Estado, jugador: Jugador): VistaDeJugador {
  const rival = rivalDe(jugador)
  return {
    jugador,
    bando: bandoDe(jugador),
    fase: estado.fase,
    misFichas: estado.fichas[jugador],
    fichasRival: estado.fichas[rival],
    apuesta: estado.apuesta,
    apuestaMaxima: leTocaApostar(estado, jugador) ? apuestaMaxima(estado) : null,
    mano: [...estado.manos[jugador]],
    miEleccion: estado.elecciones[jugador] ?? null,
    cartasRival: estado.manos[rival].length,
    rivalHaElegido: estado.elecciones[rival] !== undefined,
    enfrentamientos: estado.enfrentamientos.map((e) => ({ mia: e[jugador], rival: e[rival] })),
    ganadorRonda: estado.ganadorRonda,
    pago: estado.pago,
    resultado: estado.resultado,
  }
}
