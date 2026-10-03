import type {
  Accion,
  Bando,
  Carta,
  Configuracion,
  Enfrentamiento,
  Estado,
  Jugador,
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

export function crearPartida(configuracion: Configuracion, _rng: Rng): Estado {
  return {
    configuracion,
    fase: 'enfrentamientos',
    manos: { A: repartirMano(bandoDe('A')), B: repartirMano(bandoDe('B')) },
    elecciones: {},
    enfrentamientos: [],
    ganadorRonda: null,
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

function revelar(estado: Estado, enfrentamiento: Enfrentamiento): Estado {
  const ganador = ganadorDe(enfrentamiento)
  return {
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
}

export function accionesLegales(estado: Estado, jugador: Jugador): Accion[] {
  if (estado.fase !== 'enfrentamientos' || estado.elecciones[jugador] !== undefined) return []
  const cartasDistintas = [...new Set(estado.manos[jugador])]
  return cartasDistintas.map((carta) => ({ tipo: 'ElegirCarta', jugador, carta }))
}

function esLegal(estado: Estado, accion: Accion): boolean {
  return accionesLegales(estado, accion.jugador).some((legal) => legal.carta === accion.carta)
}

/** Aplica la acción y devuelve el nuevo estado. Una acción ilegal devuelve el mismo estado. */
export function aplicar(estado: Estado, accion: Accion): Estado {
  if (!esLegal(estado, accion)) return estado
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
    mano: [...estado.manos[jugador]],
    miEleccion: estado.elecciones[jugador] ?? null,
    cartasRival: estado.manos[rival].length,
    rivalHaElegido: estado.elecciones[rival] !== undefined,
    enfrentamientos: estado.enfrentamientos.map((e) => ({ mia: e[jugador], rival: e[rival] })),
    ganadorRonda: estado.ganadorRonda,
  }
}
