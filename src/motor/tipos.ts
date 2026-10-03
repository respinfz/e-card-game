/** Asiento en la mesa. Cuál de los dos es el jugador A lo decide el sorteo. */
export type Jugador = 'J1' | 'J2'

export type Bando = 'Emperador' | 'Esclavo'

export type Carta = 'Emperador' | 'Esclavo' | 'Ciudadano'

export type Multiplicador = 4 | 5

export interface Configuracion {
  multiplicador: Multiplicador
}

/** Devuelve un número en [0, 1), como Math.random. */
export type Rng = () => number

export type Fase = 'apuesta' | 'enfrentamientos' | 'resultadoRonda' | 'finPartida'

export type Enfrentamiento = Record<Jugador, Carta>

/** Por qué terminó la partida. */
export type Motivo = 'finDeRondas' | 'sinFichas' | 'pagoNoCubierto'

export interface Resultado {
  ganador: Jugador
  motivo: Motivo
}

export interface Estado {
  configuracion: Configuracion
  jugadorA: Jugador
  /** Semilla del generador interno para la carta al azar; sale del rng inyectado en crearPartida. */
  semilla: number
  /** Número de ronda, desde 1. */
  ronda: number
  fase: Fase
  fichas: Record<Jugador, number>
  apuesta: number | null
  manos: Record<Jugador, Carta[]>
  elecciones: Partial<Record<Jugador, Carta>>
  enfrentamientos: Enfrentamiento[]
  ganadorRonda: Jugador | null
  /** Fichas que cambiaron de manos al terminar la ronda. */
  pago: number | null
  /** Ganador y motivo cuando la partida ha terminado. */
  resultado: Resultado | null
}

export type Accion =
  | { tipo: 'Apostar'; jugador: Jugador; cantidad: number }
  | { tipo: 'ElegirCarta'; jugador: Jugador; carta: Carta }
  | { tipo: 'JugarCartaAlAzar'; jugador: Jugador }
  | { tipo: 'ContinuarRonda' }

export interface EnfrentamientoVisto {
  mia: Carta
  rival: Carta
}

export interface VistaDeJugador {
  jugador: Jugador
  /** El asiento que ganó el sorteo: Emperador en el primer bloque y en la primera ronda de cada desempate. */
  jugadorA: Jugador
  bando: Bando
  ronda: number
  bloque: number
  esDesempate: boolean
  multiplicador: Multiplicador
  fase: Fase
  misFichas: number
  fichasRival: number
  apuesta: number | null
  /** La apuesta más alta que puede elegir este jugador, o null si no le toca apostar. */
  apuestaMaxima: number | null
  mano: Carta[]
  /** La carta que este jugador ya eligió en el enfrentamiento actual y aún no se ha revelado. */
  miEleccion: Carta | null
  cartasRival: number
  /** Si el rival ya eligió carta en el enfrentamiento actual (nunca cuál). */
  rivalHaElegido: boolean
  enfrentamientos: EnfrentamientoVisto[]
  ganadorRonda: Jugador | null
  pago: number | null
  resultado: Resultado | null
}
