import type {
  Accion,
  Bando,
  Carta,
  Configuracion,
  Enfrentamiento,
  Estado,
  Jugador,
  Resultado,
  RondaJugada,
  Rng,
  VistaDeJugador,
} from './tipos'
import { siguienteAleatorio } from './aleatorio'

function rivalDe(jugador: Jugador): Jugador {
  return jugador === 'J1' ? 'J2' : 'J1'
}

const RONDAS_POR_BLOQUE = 3
const RONDAS_DE_LA_PARTIDA = 12
const RONDAS_POR_DESEMPATE = 2
const APUESTA_DESEMPATE = 5

function esDesempate(ronda: number): boolean {
  return ronda > RONDAS_DE_LA_PARTIDA
}

/** Posición de la ronda dentro de su desempate: 1 o 2. */
function rondaDelDesempate(ronda: number): number {
  return ((ronda - RONDAS_DE_LA_PARTIDA - 1) % RONDAS_POR_DESEMPATE) + 1
}

function bloqueDe(ronda: number): number {
  if (!esDesempate(ronda)) return Math.ceil(ronda / RONDAS_POR_BLOQUE)
  const bloquesNormales = RONDAS_DE_LA_PARTIDA / RONDAS_POR_BLOQUE
  return bloquesNormales + Math.ceil((ronda - RONDAS_DE_LA_PARTIDA) / RONDAS_POR_DESEMPATE)
}

/** Si la ronda cierra la partida normal o un desempate: ahí se mira quién tiene más fichas. */
function cierraUnTramo(ronda: number): boolean {
  return ronda === RONDAS_DE_LA_PARTIDA || (esDesempate(ronda) && rondaDelDesempate(ronda) === RONDAS_POR_DESEMPATE)
}

/**
 * El jugador A es Emperador en los bloques impares de la partida normal
 * y en la primera ronda de cada desempate.
 */
function bandoDe(estado: Estado, jugador: Jugador): Bando {
  const aEsEmperador = esDesempate(estado.ronda)
    ? rondaDelDesempate(estado.ronda) === 1
    : bloqueDe(estado.ronda) % 2 === 1
  return (jugador === estado.jugadorA) === aEsEmperador ? 'Emperador' : 'Esclavo'
}

function jugadorEsclavo(estado: Estado): Jugador {
  return bandoDe(estado, 'J1') === 'Esclavo' ? 'J1' : 'J2'
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

/**
 * Empieza la ronda indicada: reparte las manos según los bandos y espera la apuesta.
 * En el desempate la apuesta es fija y se pasa directamente a los enfrentamientos.
 */
function empezarRonda(estado: Estado, ronda: number): Estado {
  const conRonda = { ...estado, ronda }
  const desempate = esDesempate(ronda)
  return {
    ...conRonda,
    fase: desempate ? 'enfrentamientos' : 'apuesta',
    apuesta: desempate ? APUESTA_DESEMPATE : null,
    manos: {
      J1: repartirMano(bandoDe(conRonda, 'J1')),
      J2: repartirMano(bandoDe(conRonda, 'J2')),
    },
    elecciones: {},
    enfrentamientos: [],
    ganadorRonda: null,
    pago: null,
  }
}

export function crearPartida(configuracion: Configuracion, rng: Rng): Estado {
  const jugadorA: Jugador = rng() < 0.5 ? 'J1' : 'J2'
  const vacio: Estado = {
    configuracion,
    jugadorA,
    semilla: Math.floor(rng() * 2 ** 32),
    ronda: 1,
    fase: 'apuesta',
    fichas: { J1: FICHAS_INICIALES, J2: FICHAS_INICIALES },
    apuesta: null,
    manos: { J1: [], J2: [] },
    elecciones: {},
    enfrentamientos: [],
    ganadorRonda: null,
    pago: null,
    resultado: null,
    historial: [],
  }
  return empezarRonda(vacio, 1)
}

function continuarRonda(estado: Estado): Estado {
  if (estado.resultado !== null) return { ...estado, fase: 'finPartida' }
  return empezarRonda(estado, estado.ronda + 1)
}

const VENCE_A: Record<Carta, Carta> = {
  Emperador: 'Ciudadano',
  Ciudadano: 'Esclavo',
  Esclavo: 'Emperador',
}

/** Ganador del enfrentamiento, o null si son dos Ciudadanos y se descartan. */
function ganadorDe(enfrentamiento: Enfrentamiento): Jugador | null {
  if (VENCE_A[enfrentamiento.J1] === enfrentamiento.J2) return 'J1'
  if (VENCE_A[enfrentamiento.J2] === enfrentamiento.J1) return 'J2'
  return null
}

function pagar(estado: Estado, ganador: Jugador): Estado {
  const perdedor = rivalDe(ganador)
  const factor = bandoDe(estado, ganador) === 'Esclavo' ? estado.configuracion.multiplicador : 1
  const debe = estado.apuesta! * factor
  // Si el perdedor no puede cubrir el pago, entrega todo lo que tiene y pierde la partida.
  const pago = Math.min(debe, estado.fichas[perdedor])
  const fichas = { ...estado.fichas }
  fichas[ganador] += pago
  fichas[perdedor] -= pago
  let resultado: Resultado | null = null
  if (pago < debe) resultado = { ganador, motivo: 'pagoNoCubierto' }
  else if (fichas[perdedor] === 0) resultado = { ganador, motivo: 'sinFichas' }
  else if (cierraUnTramo(estado.ronda) && fichas.J1 !== fichas.J2) {
    resultado = { ganador: fichas.J1 > fichas.J2 ? 'J1' : 'J2', motivo: 'finDeRondas' }
  }
  const ronda: RondaJugada = {
    ronda: estado.ronda,
    ganador,
    bandos: { J1: bandoDe(estado, 'J1'), J2: bandoDe(estado, 'J2') },
    apuesta: estado.apuesta!,
    pago,
    enfrentamientoDecisivo: estado.enfrentamientos.length,
    cartasDecisivas: estado.enfrentamientos.at(-1)!,
  }
  return { ...estado, fichas, pago, resultado, historial: [...estado.historial, ronda] }
}

function revelar(estado: Estado, enfrentamiento: Enfrentamiento): Estado {
  const ganador = ganadorDe(enfrentamiento)
  const revelado: Estado = {
    ...estado,
    fase: ganador === null ? 'enfrentamientos' : 'resultadoRonda',
    manos: {
      J1: quitarUna(estado.manos.J1, enfrentamiento.J1),
      J2: quitarUna(estado.manos.J2, enfrentamiento.J2),
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
  return Math.min(APUESTA_TOPE, estado.fichas[jugadorEsclavo(estado)])
}

function leTocaApostar(estado: Estado, jugador: Jugador): boolean {
  return estado.fase === 'apuesta' && jugador === jugadorEsclavo(estado)
}

function puedeElegirCarta(estado: Estado, jugador: Jugador): boolean {
  return estado.fase === 'enfrentamientos' && estado.elecciones[jugador] === undefined
}

/** Elige con el generador interno una carta de la mano del jugador y avanza la semilla. */
function cartaAlAzar(estado: Estado, jugador: Jugador): [Carta, Estado] {
  const [valor, semilla] = siguienteAleatorio(estado.semilla)
  const mano = estado.manos[jugador]
  return [mano[Math.floor(valor * mano.length)], { ...estado, semilla }]
}

function elegirCarta(estado: Estado, jugador: Jugador, carta: Carta): Estado {
  const elecciones = { ...estado.elecciones, [jugador]: carta }
  if (elecciones.J1 !== undefined && elecciones.J2 !== undefined) {
    return revelar(estado, { J1: elecciones.J1, J2: elecciones.J2 })
  }
  return { ...estado, elecciones }
}

export function accionesLegales(estado: Estado, jugador: Jugador): Accion[] {
  if (estado.fase === 'resultadoRonda') return [{ tipo: 'ContinuarRonda' }]
  if (estado.fase === 'apuesta') {
    if (!leTocaApostar(estado, jugador)) return []
    return Array.from({ length: apuestaMaxima(estado) }, (_, i) => ({ tipo: 'Apostar', jugador, cantidad: i + 1 }))
  }
  if (!puedeElegirCarta(estado, jugador)) return []
  const cartasDistintas = [...new Set(estado.manos[jugador])]
  return [
    ...cartasDistintas.map((carta): Accion => ({ tipo: 'ElegirCarta', jugador, carta })),
    { tipo: 'JugarCartaAlAzar', jugador },
  ]
}

function esLegal(estado: Estado, accion: Accion): boolean {
  if (accion.tipo === 'ContinuarRonda') return estado.fase === 'resultadoRonda'
  if (accion.tipo === 'JugarCartaAlAzar') return puedeElegirCarta(estado, accion.jugador)
  return accionesLegales(estado, accion.jugador).some(
    (legal) => JSON.stringify(legal) === JSON.stringify(accion),
  )
}

/** Aplica la acción y devuelve el nuevo estado. Una acción ilegal devuelve el mismo estado. */
export function aplicar(estado: Estado, accion: Accion): Estado {
  if (!esLegal(estado, accion)) return estado
  if (accion.tipo === 'ContinuarRonda') return continuarRonda(estado)
  if (accion.tipo === 'Apostar') return { ...estado, fase: 'enfrentamientos', apuesta: accion.cantidad }
  if (accion.tipo === 'JugarCartaAlAzar') {
    const [carta, conSemilla] = cartaAlAzar(estado, accion.jugador)
    return elegirCarta(conSemilla, accion.jugador, carta)
  }
  return elegirCarta(estado, accion.jugador, accion.carta)
}

export function vistaDeJugador(estado: Estado, jugador: Jugador): VistaDeJugador {
  const rival = rivalDe(jugador)
  return {
    jugador,
    jugadorA: estado.jugadorA,
    bando: bandoDe(estado, jugador),
    ronda: estado.ronda,
    bloque: bloqueDe(estado.ronda),
    esDesempate: esDesempate(estado.ronda),
    multiplicador: estado.configuracion.multiplicador,
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
    historial: estado.historial.map((r) => ({
      ronda: r.ronda,
      ganador: r.ganador,
      miBando: r.bandos[jugador],
      apuesta: r.apuesta,
      pago: r.pago,
      enfrentamientoDecisivo: r.enfrentamientoDecisivo,
      cartasDecisivas: { mia: r.cartasDecisivas[jugador], rival: r.cartasDecisivas[rival] },
    })),
  }
}
