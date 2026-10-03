import { useEffect, useState } from 'react'
import { aplicar, crearPartida, vistaDeJugador } from './motor'
import type { Bando, Carta, Estado, Jugador, Rng } from './motor'
import { decidir } from './ia/ia'

const HUMANO: Jugador = 'A'
const IA: Jugador = 'B'
const CONFIGURACION = { multiplicador: 4 } as const

const BANDO_CONTRARIO: Record<Bando, Bando> = { Emperador: 'Esclavo', Esclavo: 'Emperador' }

const ETIQUETA: Record<Carta, string> = {
  Emperador: 'EMPERADOR',
  Esclavo: 'ESCLAVO',
  Ciudadano: 'CIUDADANO',
}

function eleccionDeLaIA(estado: Estado, rng: Rng): Estado {
  const accion = decidir(vistaDeJugador(estado, IA), rng)
  return accion ? aplicar(estado, accion) : estado
}

export function App({ rng = Math.random }: { rng?: Rng }) {
  const [estado, setEstado] = useState(() => crearPartida(CONFIGURACION, rng))
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const vista = vistaDeJugador(estado, HUMANO)

  // La IA elige en cuanto empieza cada enfrentamiento, sin ver la elección del humano.
  // Si no le toca, eleccionDeLaIA devuelve el mismo estado y React no vuelve a renderizar.
  useEffect(() => {
    setEstado((actual) => eleccionDeLaIA(actual, rng))
  }, [estado, rng])

  function confirmar() {
    if (seleccion === null) return
    setEstado(aplicar(estado, { tipo: 'ElegirCarta', jugador: HUMANO, carta: vista.mano[seleccion] }))
    setSeleccion(null)
  }

  function apostar() {
    setEstado(aplicar(estado, { tipo: 'Apostar', jugador: HUMANO, cantidad }))
  }

  function otraRonda() {
    setEstado(crearPartida(CONFIGURACION, rng))
    setSeleccion(null)
    setCantidad(1)
  }

  const ultimo = vista.enfrentamientos.at(-1)

  return (
    <main className="mesa">
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
        <h2>Enfrentamientos</h2>
        {vista.fase === 'apuesta' ? null : vista.enfrentamientos.length === 0 ? (
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
        {vista.fase === 'enfrentamientos' && ultimo?.mia === 'Ciudadano' && ultimo.rival === 'Ciudadano' && (
          <p>Dos Ciudadanos: se descartan. Otro enfrentamiento.</p>
        )}
        {vista.fase === 'resultadoRonda' && (
          <div className="resultado" role="status">
            <p>
              {vista.ganadorRonda === HUMANO ? '¡Ganas la ronda!' : 'El rival gana la ronda.'}{' '}
              {vista.pago} fichas cambian de manos.
            </p>
            {vista.resultado && (
              <p>{vista.resultado.ganador === HUMANO ? '¡Ganas la partida!' : 'Pierdes la partida.'}</p>
            )}
            <button onClick={otraRonda}>Jugar otra ronda</button>
          </div>
        )}
      </section>

      <section className="zona-jugador" aria-label="Tu mano">
        <h2>Tú (jugador {vista.bando})</h2>
        <p className="fichas">Fichas: {vista.misFichas}</p>
        <div className="cartas">
          {vista.mano.map((carta, i) => (
            <button
              key={i}
              className={`carta${seleccion === i ? ' seleccionada' : ''}`}
              disabled={vista.fase !== 'enfrentamientos' || vista.miEleccion !== null}
              aria-pressed={seleccion === i}
              onClick={() => setSeleccion(i)}
            >
              {ETIQUETA[carta]}
            </button>
          ))}
        </div>
        <button className="confirmar" disabled={seleccion === null} onClick={confirmar}>
          Confirmar
        </button>
      </section>
    </main>
  )
}
