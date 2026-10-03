import type { Carta } from './motor'

// Los sprites viven en public/sprites/ y los genera scripts/generar-sprites.mjs.
// Para cambiar el arte basta con sustituir los PNG manteniendo sus nombres.
const RUTA = `${import.meta.env.BASE_URL}sprites/`

const NOMBRE_CARTA: Record<Carta, string> = {
  Ciudadano: 'carta-ciudadano',
  Emperador: 'carta-emperador',
  Esclavo: 'carta-esclavo',
}

export const SPRITE = {
  carta: (carta: Carta) => `${RUTA}${NOMBRE_CARTA[carta]}.png`,
  dorso: `${RUTA}carta-dorso.png`,
  mesa: `${RUTA}mesa.png`,
  retratoRival: `${RUTA}retrato-rival.png`,
  retratoJugador: `${RUTA}retrato-jugador.png`,
}
