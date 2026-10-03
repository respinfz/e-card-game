export type Jugador = 'A' | 'B'

export type Bando = 'Emperador' | 'Esclavo'

export type Carta = 'Emperador' | 'Esclavo' | 'Ciudadano'

export type Multiplicador = 4 | 5

export interface Configuracion {
  multiplicador: Multiplicador
}

/** Devuelve un número en [0, 1), como Math.random. */
export type Rng = () => number

export type Fase = 'enfrentamientos' | 'resultadoRonda'

export type Enfrentamiento = Record<Jugador, Carta>

export interface Estado {
  configuracion: Configuracion
  fase: Fase
  manos: Record<Jugador, Carta[]>
  elecciones: Partial<Record<Jugador, Carta>>
  enfrentamientos: Enfrentamiento[]
  ganadorRonda: Jugador | null
}

export type Accion = { tipo: 'ElegirCarta'; jugador: Jugador; carta: Carta }

export interface EnfrentamientoVisto {
  mia: Carta
  rival: Carta
}

export interface VistaDeJugador {
  jugador: Jugador
  bando: Bando
  fase: Fase
  mano: Carta[]
  /** La carta que este jugador ya eligió en el enfrentamiento actual y aún no se ha revelado. */
  miEleccion: Carta | null
  cartasRival: number
  /** Si el rival ya eligió carta en el enfrentamiento actual (nunca cuál). */
  rivalHaElegido: boolean
  enfrentamientos: EnfrentamientoVisto[]
  ganadorRonda: Jugador | null
}
