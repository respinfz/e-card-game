// Genera los sprites pixel art del juego en public/sprites/.
// Uso: npm run sprites
//
// Todo el arte es propio y se dibuja aquí con la paleta del juego; no se usa ninguna
// imagen de terceros. Para sustituir un sprite basta con reemplazar su PNG manteniendo
// el nombre (y, para las cartas, la banda clara inferior donde va la etiqueta).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sprites')

// Paleta oscura y apagada.
const PALETA = {
  '.': null, // transparente
  k: '#0e0c10', // contorno
  m: '#2a2230', // marco oscuro
  c: '#e6d8b8', // crema
  s: '#c8905c', // piel
  S: '#8a5a3a', // piel en sombra
  h: '#3a2e2a', // pelo oscuro
  y: '#d6a84e', // oro
  Y: '#8a6430', // oro oscuro
  o: '#b07a44', // ocre
  r: '#a2473f', // rojo
  R: '#6a2a2c', // rojo oscuro
  w: '#d8d2c4', // barba
  b: '#4a6898', // azul
  B: '#2e3f66', // azul oscuro
  g: '#8a8494', // gris
  G: '#55505e', // gris oscuro
  p: '#5b4a78', // morado
  l: '#9486b0', // lavanda
  v: '#8c9b5a', // verde
  V: '#4e5a34', // verde oscuro
}

// ---------------------------------------------------------------------------
// Lienzo mínimo

function lienzo(ancho, alto) {
  const pixeles = Array.from({ length: alto }, () => Array(ancho).fill(null))
  const dentro = (x, y) => x >= 0 && y >= 0 && x < ancho && y < alto
  return {
    ancho,
    alto,
    pixeles,
    punto(x, y, color) {
      if (dentro(x, y) && color !== undefined) pixeles[y][x] = color
    },
    rect(x, y, w, h, color) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.punto(i, j, color)
    },
    elipse(cx, cy, rx, ry, color) {
      for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
        for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
          const dx = (i + 0.5 - cx) / rx
          const dy = (j + 0.5 - cy) / ry
          if (dx * dx + dy * dy <= 1) this.punto(i, j, color)
        }
      }
    },
    /** Dibuja un mapa de caracteres de la paleta; '.' deja lo que hubiera debajo. */
    mapa(x, y, filas) {
      const ancho = filas[0].length
      filas.forEach((fila, j) => {
        if (fila.length !== ancho) throw new Error(`Fila ${j} de ancho ${fila.length}, se esperaba ${ancho}: "${fila}"`)
        ;[...fila].forEach((letra, i) => {
          if (!(letra in PALETA)) throw new Error(`Color desconocido "${letra}"`)
          if (PALETA[letra] !== null) this.punto(x + i, y + j, PALETA[letra])
        })
      })
    },
  }
}

/** Generador determinista para las texturas: el mismo script produce siempre los mismos PNG. */
function aleatorio(semilla) {
  let a = semilla
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Codificación PNG (RGBA de 8 bits, sin dependencias)

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(datos) {
  let c = 0xffffffff
  for (const byte of datos) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function bloque(tipo, datos) {
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([longitud, cuerpo, crc])
}

function png({ ancho, alto, pixeles }) {
  const crudo = Buffer.alloc(alto * (1 + ancho * 4))
  pixeles.forEach((fila, y) => {
    const inicio = y * (1 + ancho * 4)
    fila.forEach((color, x) => {
      if (color === null) return
      const valor = parseInt(color.slice(1), 16)
      crudo.writeUInt32BE(((valor << 8) | 0xff) >>> 0, inicio + 1 + x * 4)
    })
  })
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho, 0)
  cabecera.writeUInt32BE(alto, 4)
  cabecera[8] = 8 // bits por canal
  cabecera[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(crudo, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Cartas: 24 × 32. Arte en las filas 2–21 y banda clara para la etiqueta en las filas 23–29.

const CARTA_ANCHO = 24
const CARTA_ALTO = 32

const FIGURA_CIUDADANO = [
  '......kkkk......',
  '.....khhhhk.....',
  '.....kssssk.....',
  '.....kskssk.....',
  '.....kssssk.....',
  '......kssk......',
  '....kkbbbbkk....',
  '...kbbbbbbbbk...',
  '..kbbkbbbbkbbk..',
  '..kbk.bbbb.kbk..',
  '..ksk.bbbb.ksk..',
  '..kk..bbbb..kk..',
  '......bbbb......',
  '.....kbbbbk.....',
  '.....kbkkbk.....',
  '.....kbk.kbk....',
  '.....kck.kck....',
  '.....kkk.kkk....',
]

const FIGURA_EMPERADOR = [
  '....ky.yy.yk....',
  '....kyyyyyyk....',
  '....kyryyryk....',
  '....kssssssk....',
  '....kskssksk....',
  '....kssssssk....',
  '....kwwwwwwk....',
  '...kkwwwwwwkk...',
  '..krrrwwwwrrrk..',
  '..krryywwyyrrk..',
  '.krrrryyyyrrrrk.',
  '.krsrryyyyrrsrk.',
  '.kkkrryyyyrrkkk.',
  '...krryyyyrrk...',
  '...krrryyrrrk...',
  '..krrrryyrrrrk..',
  '..kooooooooook..',
  '..kkkkkkkkkkkk..',
]

const FIGURA_ESCLAVO = [
  '................',
  '................',
  '......kkkk......',
  '.....kRRRRk.....',
  '....kRRRRRRk....',
  '....kRkSSRRk....',
  '....kRSSkRRk....',
  '...kRRSSRRRRk...',
  '..kRRRRRRRRRRk..',
  '..kRRRRRRRRRRRk.',
  '..kRSRRRRRRRRRk.',
  '..kSkRRRRRRRRRk.',
  '..kgk.kRRRRRRk..',
  '...g..kSkkkSk...',
  '...g..kSk.kSk...',
  '..kgk.kgggggk...',
  '.kGGGk..........',
  '..kkk...........',
]

function carta({ marco, fondo, dibujarFondo, figura }) {
  const l = lienzo(CARTA_ANCHO, CARTA_ALTO)
  l.rect(0, 0, CARTA_ANCHO, CARTA_ALTO, PALETA.k)
  l.rect(1, 1, CARTA_ANCHO - 2, CARTA_ALTO - 2, marco)
  l.rect(2, 2, CARTA_ANCHO - 4, 20, fondo)
  dibujarFondo(l)
  l.mapa(4, 3, figura)
  // Banda de la etiqueta: el texto en español se superpone desde el código.
  l.rect(2, 23, CARTA_ANCHO - 4, 7, PALETA.k)
  l.rect(3, 24, CARTA_ANCHO - 6, 5, PALETA.c)
  return l
}

function ladrillos(l, color) {
  for (let y = 2; y < 22; y += 3) {
    l.rect(2, y, CARTA_ANCHO - 4, 1, color)
    const desfase = (y / 3) % 2 === 0 ? 2 : 5
    for (let x = 2 + desfase; x < CARTA_ANCHO - 2; x += 6) l.rect(x, y, 1, 3, color)
  }
}

function rayas(l, color, paso) {
  for (let x = 3; x < CARTA_ANCHO - 2; x += paso) l.rect(x, 2, 1, 20, color)
}

const SPRITES = {
  'carta-ciudadano': () =>
    carta({ marco: PALETA.B, fondo: PALETA.b, dibujarFondo: (l) => ladrillos(l, PALETA.B), figura: FIGURA_CIUDADANO }),
  'carta-emperador': () =>
    carta({ marco: PALETA.Y, fondo: PALETA.o, dibujarFondo: (l) => rayas(l, PALETA.Y, 4), figura: FIGURA_EMPERADOR }),
  'carta-esclavo': () =>
    carta({ marco: PALETA.R, fondo: PALETA.p, dibujarFondo: (l) => rayas(l, PALETA.r, 3), figura: FIGURA_ESCLAVO }),

  'carta-dorso': () => {
    const l = lienzo(CARTA_ANCHO, CARTA_ALTO)
    l.rect(0, 0, CARTA_ANCHO, CARTA_ALTO, PALETA.k)
    l.rect(1, 1, CARTA_ANCHO - 2, CARTA_ALTO - 2, PALETA.o)
    l.rect(2, 2, CARTA_ANCHO - 4, CARTA_ALTO - 4, PALETA.k)
    l.rect(3, 3, CARTA_ANCHO - 6, CARTA_ALTO - 6, PALETA.r)
    // Celosía de rombos.
    for (let y = 3; y < CARTA_ALTO - 3; y++) {
      for (let x = 3; x < CARTA_ANCHO - 3; x++) {
        if ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) l.punto(x, y, PALETA.R)
      }
    }
    l.rect(10, 14, 4, 4, PALETA.y)
    l.rect(11, 13, 2, 6, PALETA.y)
    l.rect(9, 15, 6, 2, PALETA.y)
    return l
  },

  // Textura de la mesa: piedra morada con grietas, en mosaico de 32 × 32.
  mesa: () => {
    const l = lienzo(32, 32)
    const azar = aleatorio(11)
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const r = azar()
        l.punto(x, y, r < 0.12 ? PALETA.l : r < 0.2 ? PALETA.G : PALETA.p)
      }
    }
    // Grietas que cruzan el borde para que el mosaico encaje.
    let x = 4
    for (let y = 0; y < 32; y++) {
      l.punto(x % 32, y, PALETA.m)
      if (azar() < 0.4) x += 1
    }
    let y = 20
    for (let i = 0; i < 32; i++) {
      l.punto(i, ((y % 32) + 32) % 32, PALETA.m)
      if (azar() < 0.3) y += azar() < 0.5 ? 1 : -1
    }
    return l
  },

  // Retratos genéricos de 32 × 32, sin personajes del manga.
  'retrato-rival': () =>
    retrato({ fondo: PALETA.r, marco: PALETA.R, pelo: PALETA.g, peloSombra: PALETA.G, ropa: PALETA.k, peinado: 'liso' }),
  'retrato-jugador': () =>
    retrato({ fondo: PALETA.v, marco: PALETA.V, pelo: PALETA.h, peloSombra: PALETA.k, ropa: PALETA.B, peinado: 'revuelto' }),
}

function retrato({ fondo, marco, pelo, peloSombra, ropa, peinado }) {
  const l = lienzo(32, 32)
  l.rect(0, 0, 32, 32, PALETA.k)
  l.rect(1, 1, 30, 30, marco)
  l.rect(2, 2, 28, 28, PALETA.k)
  l.elipse(16, 16, 13, 13, fondo)
  // Hombros y cuello.
  l.elipse(16, 31, 12, 7, PALETA.k)
  l.elipse(16, 31, 11, 6, ropa)
  l.rect(14, 21, 4, 4, PALETA.S)
  // Cabeza.
  l.elipse(16, 15, 7, 8.5, PALETA.k)
  l.elipse(16, 15, 6, 7.5, PALETA.s)
  l.rect(12, 14, 3, 1, PALETA.k)
  l.rect(18, 14, 3, 1, PALETA.k)
  l.rect(16, 15, 1, 3, PALETA.S)
  l.rect(14, 19, 5, 1, PALETA.S)
  // Pelo.
  if (peinado === 'liso') {
    l.elipse(16, 9, 7.5, 4.5, pelo)
    l.rect(9, 9, 2, 7, pelo)
    l.rect(21, 9, 2, 7, pelo)
    for (let x = 10; x < 22; x += 3) l.rect(x, 7, 1, 4, peloSombra)
  } else {
    l.elipse(16, 9, 8, 5, pelo)
    for (const [x, alto] of [[9, 7], [12, 5], [15, 6], [18, 4], [21, 7]]) l.rect(x, 9, 2, alto, pelo)
    l.rect(11, 6, 1, 3, peloSombra)
    l.rect(17, 5, 1, 3, peloSombra)
  }
  return l
}

mkdirSync(DESTINO, { recursive: true })
for (const [nombre, dibujar] of Object.entries(SPRITES)) {
  writeFileSync(join(DESTINO, `${nombre}.png`), png(dibujar()))
  console.log(`sprites/${nombre}.png`)
}
