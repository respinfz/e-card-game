import { useEffect, useState } from 'react'
import { aplicar, crearPartida, vistaDeJugador } from './motor'
import type { Bando, Carta, Estado, Jugador, Motivo, Rng, VistaDeJugador } from './motor'
import { decidir } from './ia/ia'

const HUMANO: Jugador = 'J1'
const IA: Jugador = 'J2'
const CONFIGURACION = { multiplicador: 4 } as const

/** Cuánto se ven dos Ciudadanos revelados antes de pasar al siguiente enfrentamiento. */
export const PAUSA_EMPATE_MS = 1500

const BANDO_CONTRARIO: Record<Bando, Bando> = { Emperador: 'Esclavo', Esclavo: 'Emperador' }

const ETIQUETA: Record<Carta, string> = {
  Emperador: 'EMPERADOR',
  Esclavo: 'ESCLAVO',
  Ciudadano: 'CIUDADANO',
}

const MOTIVO: Record<Motivo, string> = {
  finDeRondas: 'Fin de las 12 rondas',
  sinFichas: 'Un jugador se quedó sin fichas',
  pagoNoCubierto: 'Un jugador no pudo cubrir el pago',
}

function eleccionDeLaIA(estado: Estado, rng: Rng): Estado {
  const accion = decidir(vistaDeJugador(estado, IA), rng)
  return accion ? aplicar(estado, accion) : estado
}

export function App({ rng = Math.random }: { rng?: Rng }) {
  const [estado, setEstado] = useState(() => crearPartida(CONFIGURACION, rng))
  const vista = vistaDeJugador(estado, HUMANO)

  function jugarDeNuevo() {
    setEstado(crearPartida(CONFIGURACION, rng))
  }

  if (vista.fase === 'finPartida') return <PantallaFinal vista={vista} onJugarDeNuevo={jugarDeNuevo} />
  return <Mesa key={vista.ronda} estado={estado} setEstado={setEstado} rng={rng} />
}

function Mesa({
  estado,
  setEstado,
  rng,
}: {
  estado: Estado
  setEstado: (actualizar: (actual: Estado) => Estado) => void
  rng: Rng
}) {
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [empatesVistos, setEmpatesVistos] = useState(0)
  const vista = vistaDeJugador(estado, HUMANO)
  const reveladas = vista.enfrentamientos.length
  // Si la ronda sigue con enfrentamientos revelados, el último fueron dos Ciudadanos.
  const huboEmpate = vista.fase === 'enfrentamientos' && reveladas > 0
  const enPausa = huboEmpate && empatesVistos < reveladas

  // Tras dos Ciudadanos, una breve pausa para verlos antes del siguiente enfrentamiento.
  useEffect(() => {
    if (!enPausa) return
    const temporizador = setTimeout(() => setEmpatesVistos(reveladas), PAUSA_EMPATE_MS)
    return () => clearTimeout(temporizador)
  }, [enPausa, reveladas])

  // La IA actúa en cuanto le toca, sin ver la elección del humano.
  // Si no le toca, eleccionDeLaIA devuelve el mismo estado y React no vuelve a renderizar.
  useEffect(() => {
    if (enPausa) return
    setEstado((actual) => eleccionDeLaIA(actual, rng))
  }, [estado, rng, enPausa, setEstado])

  function confirmar() {
    if (seleccion === null) return
    const carta = vista.mano[seleccion]
    setEstado((actual) => aplicar(actual, { tipo: 'ElegirCarta', jugador: HUMANO, carta }))
    setSeleccion(null)
  }

  function apostar() {
    setEstado((actual) => aplicar(actual, { tipo: 'Apostar', jugador: HUMANO, cantidad }))
    setCantidad(1)
  }

  function continuarRonda() {
    setEstado((actual) => aplicar(actual, { tipo: 'ContinuarRonda' }))
  }

  const puedeElegir = vista.fase === 'enfrentamientos' && vista.miEleccion === null && !enPausa
  const cambioDeBando = vista.ronda > 1 && vista.fase === 'apuesta' && (vista.ronda - 1) % 3 === 0

  return (
    <main className="mesa">
      <header className="marcador" aria-label="Marcador">
        <p>
          Ronda {vista.ronda} de 12 · Bloque {vista.bloque} · Eres el jugador <strong>{vista.bando}</strong>
        </p>
        {cambioDeBando && (
          <p className="aviso" role="alert">
            ¡Cambio de bando! Ahora eres el jugador {vista.bando}.
          </p>
        )}
      </header>

      <section className="zona-rival" aria-label="Rival">
        <h2>Rival (jugador {BANDO_CONTRARIO[vista.bando]})</h2>
        <p className="fichas">Fichas: {vista.fichasRival}</p>
        <div className="cartas">
          {Array.from({ length: vista.cartasRival }, (_, i) => (
            <div key={i} className="carta dorso" aria-label="Carta boca abajo" />
          ))}
        </div>
        <p>
          Le quedan {vista.cartasRival} cartas
          {vista.fase === 'enfrentamientos' && (vista.rivalHaElegido ? ' · Ya eligió carta' : ' · Pensando…')}
        </p>
      </section>

      <section className="centro" aria-label="Enfrentamientos">
        {vista.apuesta !== null && <p className="apuesta">Apuesta: {vista.apuesta} fichas</p>}
        {vista.fase === 'apuesta' &&
          (vista.apuestaMaxima === null ? (
            <p>El rival está decidiendo la apuesta…</p>
          ) : (
            <div className="selector-apuesta">
              <label>
                Tu apuesta: <strong>{cantidad}</strong>
                <input
                  type="range"
                  min={1}
                  max={vista.apuestaMaxima}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
              </label>
              <p>
                Si ganas: +{cantidad * CONFIGURACION.multiplicador} · Si pierdes: −{cantidad}
              </p>
              <button onClick={apostar}>Apostar</button>
            </div>
          ))}
        {vista.fase !== 'apuesta' && (
          <>
            <h2>Enfrentamientos</h2>
            {vista.enfrentamientos.length === 0 ? (
              <p>Elige una carta y confírmala.</p>
            ) : (
              <ol className="enfrentamientos">
                {vista.enfrentamientos.map((e, i) => (
                  <li key={i}>
                    Tú: <strong>{ETIQUETA[e.mia]}</strong> — Rival: <strong>{ETIQUETA[e.rival]}</strong>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {enPausa && <p>Dos Ciudadanos: se descartan. Otro enfrentamiento.</p>}
        {vista.fase === 'resultadoRonda' && <ResumenRonda vista={vista} onContinuar={continuarRonda} />}
      </section>

      <section className="zona-jugador" aria-label="Tu mano">
        <h2>Tú (jugador {vista.bando})</h2>
        <p className="fichas">Fichas: {vista.misFichas}</p>
        <div className="cartas">
          {vista.mano.map((carta, i) => (
            <button
              key={i}
              className={`carta${seleccion === i ? ' seleccionada' : ''}`}
              disabled={!puedeElegir}
              aria-pressed={seleccion === i}
              onClick={() => setSeleccion(i)}
            >
              {ETIQUETA[carta]}
            </button>
          ))}
        </div>
        <button className="confirmar" disabled={seleccion === null || !puedeElegir} onClick={confirmar}>
          Confirmar
        </button>
      </section>
    </main>
  )
}

function ResumenRonda({ vista, onContinuar }: { vista: VistaDeJugador; onContinuar: () => void }) {
  const decisivo = vista.enfrentamientos.at(-1)!
  const gano = vista.ganadorRonda === HUMANO
  return (
    <div className="resultado" role="status">
      <p>
        {gano ? '¡Ganas la ronda!' : 'El rival gana la ronda.'} Tu {ETIQUETA[decisivo.mia]} contra su{' '}
        {ETIQUETA[decisivo.rival]}.
      </p>
      <p>
        {gano ? 'Cobras' : 'Pagas'} {vista.pago} fichas.
      </p>
      <button onClick={onContinuar}>Continuar</button>
    </div>
  )
}

function PantallaFinal({ vista, onJugarDeNuevo }: { vista: VistaDeJugador; onJugarDeNuevo: () => void }) {
  const resultado = vista.resultado!
  return (
    <main className="pantalla-final">
      <h1>{resultado.ganador === HUMANO ? '¡Has ganado la partida!' : 'Has perdido la partida'}</h1>
      <p>{MOTIVO[resultado.motivo]}.</p>
      <p>
        Tus fichas: {vista.misFichas} · Fichas del rival: {vista.fichasRival}
      </p>
      <button onClick={onJugarDeNuevo}>Jugar de nuevo</button>
    </main>
  )
}
