import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { aplicar, crearPartida, vistaDeJugador } from './motor'
import type { Bando, Carta, Configuracion, Estado, Jugador, Motivo, Multiplicador, Rng, VistaDeJugador } from './motor'
import { decidir } from './ia/ia'
import { SPRITE } from './sprites'

const HUMANO: Jugador = 'J1'
const IA: Jugador = 'J2'
/** Nombre genérico del rival: ningún personaje del manga. */
const NOMBRE_RIVAL = 'El Prestamista'

/** Cuánto se ven dos Ciudadanos revelados antes de pasar al siguiente enfrentamiento. */
export const PAUSA_EMPATE_MS = 1500

/** Tiempo límite para elegir carta en cada enfrentamiento. */
const TIEMPO_LIMITE_MS = 20_000
const TIC_MS = 100

/** La IA "piensa" entre 1 y 4 s antes de actuar, para parecer un rival que duda. */
const IA_PIENSA_MIN_MS = 1000
const IA_PIENSA_MAX_MS = 4000

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

function accionDeLaIA(estado: Estado, rng: Rng): Estado {
  const accion = decidir(vistaDeJugador(estado, IA), rng)
  return accion ? aplicar(estado, accion) : estado
}

/** Identifica el momento en que la IA tiene que actuar, o null si no le toca. */
function turnoDeLaIA(vista: VistaDeJugador): string | null {
  const leToca = vista.apuestaMaxima !== null || (vista.fase === 'enfrentamientos' && vista.miEleccion === null)
  return leToca ? `${vista.ronda}-${vista.fase}-${vista.enfrentamientos.length}` : null
}

export function App({ rng = Math.random }: { rng?: Rng }) {
  const [estado, setEstado] = useState<Estado | null>(null)

  if (estado === null) {
    return <PantallaConfiguracion onEmpezar={(configuracion) => setEstado(crearPartida(configuracion, rng))} />
  }
  const vista = vistaDeJugador(estado, HUMANO)
  if (vista.fase === 'finPartida') return <PantallaFinal vista={vista} onJugarDeNuevo={() => setEstado(null)} />
  return (
    <Mesa
      key={vista.ronda}
      estado={estado}
      setEstado={(actualizar) => setEstado((actual) => actualizar(actual!))}
      rng={rng}
    />
  )
}

const MODOS: { multiplicador: Multiplicador; nombre: string }[] = [
  { multiplicador: 4, nombre: 'modo justo' },
  { multiplicador: 5, nombre: 'modo manga' },
]

function PantallaConfiguracion({ onEmpezar }: { onEmpezar: (configuracion: Configuracion) => void }) {
  const [multiplicador, setMultiplicador] = useState<Multiplicador>(4)
  return (
    <main className="pantalla-configuracion">
      <h1>E-Card</h1>
      <p>Una partida de 12 rondas contra la IA. Cada jugador empieza con 30 fichas.</p>
      <fieldset>
        <legend>Multiplicador: lo que paga el jugador Emperador si gana la carta Esclavo</legend>
        {MODOS.map((modo) => (
          <label key={modo.multiplicador}>
            <input
              type="radio"
              name="multiplicador"
              checked={multiplicador === modo.multiplicador}
              onChange={() => setMultiplicador(modo.multiplicador)}
            />
            ×{modo.multiplicador} ({modo.nombre})
          </label>
        ))}
      </fieldset>
      <button onClick={() => onEmpezar({ multiplicador })}>Empezar partida</button>
    </main>
  )
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

  // Cuando le toca, la IA piensa un rato y actúa, sin ver la elección del humano.
  const turnoIA = turnoDeLaIA(vistaDeJugador(estado, IA))
  useEffect(() => {
    if (enPausa || turnoIA === null) return
    const espera = IA_PIENSA_MIN_MS + rng() * (IA_PIENSA_MAX_MS - IA_PIENSA_MIN_MS)
    const temporizador = setTimeout(() => setEstado((actual) => accionDeLaIA(actual, rng)), espera)
    return () => clearTimeout(temporizador)
  }, [turnoIA, enPausa, rng, setEstado])

  function confirmar() {
    if (seleccion === null) return
    const carta = vista.mano[seleccion]
    setEstado((actual) => aplicar(actual, { tipo: 'ElegirCarta', jugador: HUMANO, carta }))
    setSeleccion(null)
  }

  function jugarCartaAlAzar() {
    setEstado((actual) => aplicar(actual, { tipo: 'JugarCartaAlAzar', jugador: HUMANO }))
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
  const rondaAnterior = vista.historial.at(-1)
  const cambioDeBando =
    rondaAnterior !== undefined &&
    rondaAnterior.ronda === vista.ronda - 1 &&
    rondaAnterior.miBando !== vista.bando &&
    reveladas === 0

  return (
    <main className="mesa">
      <section className="panel panel-rival" aria-label="Rival">
        <img className="retrato" src={SPRITE.retratoRival} alt="Retrato del rival" />
        <div className="datos">
          <h2>{NOMBRE_RIVAL}</h2>
          <p>Jugador {BANDO_CONTRARIO[vista.bando]}</p>
          <p className="fichas">
            Fichas: <strong>{vista.fichasRival}</strong>
          </p>
          <p className="estado-rival">
            {vista.cartasRival} cartas
            {vista.fase === 'enfrentamientos' && (vista.rivalHaElegido ? ' · Ya eligió' : ' · Pensando…')}
          </p>
        </div>
      </section>

      <section className="panel panel-jugador" aria-label="Tú">
        <img className="retrato" src={SPRITE.retratoJugador} alt="Tu retrato" />
        <div className="datos">
          <h2>Tú</h2>
          <p>
            Jugador <strong>{vista.bando}</strong>
          </p>
          <p className="fichas">
            Fichas: <strong>{vista.misFichas}</strong>
          </p>
          {vista.apuesta !== null && (
            <p className="apuesta">
              Apuesta: <strong>{vista.apuesta}</strong>
            </p>
          )}
        </div>
      </section>

      <section className="tablero" aria-label="Mesa" style={{ backgroundImage: `url(${SPRITE.mesa})` }}>
        <header className="marcador" aria-label="Marcador">
          <p className="ronda">
            {vista.esDesempate ? `Desempate · Ronda ${vista.ronda}` : `Ronda ${vista.ronda} de 12`} · Bloque{' '}
            {vista.bloque} · Multiplicador ×{vista.multiplicador}
          </p>
          {vista.ronda === 1 && (
            <p className="sorteo">
              Sorteo: {vista.jugadorA === HUMANO ? 'eres el jugador A y empiezas' : 'el rival es el jugador A y empieza'}{' '}
              de Emperador.
            </p>
          )}
          {vista.esDesempate && <p className="desempate">Desempate: apuesta fija de 5 fichas.</p>}
          {cambioDeBando && (
            <p className="aviso" role="alert">
              ¡Cambio de bando! Ahora eres el jugador {vista.bando}.
            </p>
          )}
        </header>

        <div className="fila-cartas fila-rival" aria-label="Cartas del rival">
          {Array.from({ length: vista.cartasRival }, (_, i) => (
            <CartaBocaAbajo key={i} etiqueta="Carta boca abajo" />
          ))}
        </div>

        <div className="centro" aria-label="Enfrentamientos">
          {vista.fase === 'apuesta' &&
            (vista.apuestaMaxima === null ? (
              <p className="mensaje">{NOMBRE_RIVAL} está decidiendo la apuesta…</p>
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
                  Si ganas: <strong>+{cantidad * vista.multiplicador}</strong> · Si pierdes: <strong>−{cantidad}</strong>
                </p>
                <button onClick={apostar}>Apostar</button>
              </div>
            ))}
          {vista.enfrentamientos.length > 0 && (
            <ol className="enfrentamientos" aria-label="Enfrentamientos revelados">
              {vista.enfrentamientos.map((e, i) => (
                <li key={i}>
                  <CartaVista carta={e.rival} etiqueta={`Rival: ${ETIQUETA[e.rival]}`} />
                  <CartaVista carta={e.mia} etiqueta={`Tú: ${ETIQUETA[e.mia]}`} />
                </li>
              ))}
            </ol>
          )}
          {vista.fase === 'enfrentamientos' && (
            <div className="eleccion-en-curso">
              {vista.rivalHaElegido ? (
                <CartaBocaAbajo etiqueta="Carta del rival boca abajo" />
              ) : (
                <div className="hueco" aria-hidden="true" />
              )}
              {vista.miEleccion !== null ? (
                <CartaVista carta={vista.miEleccion} etiqueta={`Tu carta, aún sin revelar: ${ETIQUETA[vista.miEleccion]}`} />
              ) : (
                <div className="hueco" aria-hidden="true" />
              )}
            </div>
          )}
          {enPausa && <p className="mensaje">Dos Ciudadanos: se descartan. Otro enfrentamiento.</p>}
          {vista.fase === 'enfrentamientos' && !enPausa && vista.miEleccion === null && (
            <p className="mensaje">Elige una carta y confírmala.</p>
          )}
          {vista.fase === 'resultadoRonda' && <ResumenRonda vista={vista} onContinuar={continuarRonda} />}
        </div>

        <div className="fila-cartas fila-jugador" aria-label="Tu mano">
          {vista.mano.map((carta, i) => (
            <button
              key={i}
              className={`carta${seleccion === i ? ' seleccionada' : ''}`}
              style={{ backgroundImage: `url(${SPRITE.carta(carta)})` }}
              disabled={!puedeElegir}
              aria-pressed={seleccion === i}
              onClick={() => setSeleccion(i)}
            >
              <span className="etiqueta">{ETIQUETA[carta]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="controles" aria-label="Controles">
        {puedeElegir ? (
          <Reloj key={reveladas} onAgotado={jugarCartaAlAzar} />
        ) : (
          <div className="reloj apagado" aria-hidden="true">
            <span>—</span>
          </div>
        )}
        <button className="confirmar" disabled={seleccion === null || !puedeElegir} onClick={confirmar}>
          Confirmar
        </button>
      </section>

      <Historial vista={vista} />
    </main>
  )
}

/**
 * Cuenta atrás del tiempo límite. Se monta al empezar cada enfrentamiento y
 * no avanza mientras la página está oculta (pestaña o aplicación en segundo plano).
 */
function Reloj({ onAgotado }: { onAgotado: () => void }) {
  const [restante, setRestante] = useState(TIEMPO_LIMITE_MS)

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      setRestante((actual) => Math.max(0, actual - TIC_MS))
    }, TIC_MS)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (restante === 0) onAgotado()
  }, [restante, onAgotado])

  const fraccion = restante / TIEMPO_LIMITE_MS
  return (
    <div
      className={`reloj${restante <= 5000 ? ' urgente' : ''}`}
      style={{ '--fraccion': fraccion } as CSSProperties}
      role="timer"
      aria-label="Tiempo límite"
    >
      <span>{Math.ceil(restante / 1000)} s</span>
    </div>
  )
}

/** Carta boca arriba con su sprite y la etiqueta en español superpuesta. */
function CartaVista({ carta, etiqueta }: { carta: Carta; etiqueta: string }) {
  return (
    <div className="carta" style={{ backgroundImage: `url(${SPRITE.carta(carta)})` }} role="img" aria-label={etiqueta}>
      <span className="etiqueta" aria-hidden="true">
        {ETIQUETA[carta]}
      </span>
    </div>
  )
}

function CartaBocaAbajo({ etiqueta }: { etiqueta: string }) {
  return (
    <div className="carta dorso" style={{ backgroundImage: `url(${SPRITE.dorso})` }} role="img" aria-label={etiqueta} />
  )
}

function Historial({ vista }: { vista: VistaDeJugador }) {
  return (
    <section className="historial" aria-label="Historial">
      <h2>Historial</h2>
      {vista.historial.length === 0 ? (
        <p>Aún no ha terminado ninguna ronda.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Ronda</th>
              <th scope="col">Tu bando</th>
              <th scope="col">Apuesta</th>
              <th scope="col">Ganador</th>
              <th scope="col">Carta especial</th>
            </tr>
          </thead>
          <tbody>
            {vista.historial.map((ronda) => (
              <tr key={ronda.ronda}>
                <td>{ronda.ronda}</td>
                <td>{ronda.miBando}</td>
                <td>{ronda.apuesta}</td>
                <td>{ronda.ganador === HUMANO ? 'Tú' : NOMBRE_RIVAL}</td>
                <td>
                  {ronda.enfrentamientoDecisivo}.º enfrentamiento: {ETIQUETA[ronda.cartasDecisivas.mia]} contra{' '}
                  {ETIQUETA[ronda.cartasDecisivas.rival]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
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
      <p className="fichas-finales">
        Tus fichas: <strong>{vista.misFichas}</strong> · Fichas de {NOMBRE_RIVAL}: <strong>{vista.fichasRival}</strong>
      </p>
      <button onClick={onJugarDeNuevo}>Jugar de nuevo</button>
    </main>
  )
}
