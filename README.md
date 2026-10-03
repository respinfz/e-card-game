# E-Card

Versión web del E-Card del manga Kaiji: una partida contra una IA, en el navegador y en el móvil, con pixel art propio.

**Jugar:** https://respinfz.github.io/e-card-game/

## Reglas

- **Bandos.** En cada ronda un jugador es Emperador y el otro Esclavo. El jugador Emperador recibe la carta Emperador y 4 Ciudadanos; el jugador Esclavo, la carta Esclavo y 4 Ciudadanos.
- **Jerarquía.** Emperador vence a Ciudadano, Ciudadano vence a Esclavo y Esclavo vence a Emperador. Dos Ciudadanos se descartan y se juega otro enfrentamiento.
- **Enfrentamientos.** Los dos jugadores eligen carta en secreto y se revelan a la vez. Hay 20 segundos para elegir; si se agotan, se juega una carta al azar. La ronda termina en cuanto aparece una carta especial.
- **Apuesta.** Antes de repartir, el jugador Esclavo apuesta de 1 a 10 fichas, sin superar las suyas. Si gana el jugador Emperador, cobra la apuesta; si gana el jugador Esclavo, cobra la apuesta × el multiplicador (×4 en modo justo o ×5 en modo manga).
- **Partida.** Cada jugador empieza con 30 fichas. Hay 12 rondas en 4 bloques de 3, y los bandos se intercambian en cada bloque; un sorteo decide quién empieza de Emperador. Gana quien tenga más fichas al final. Quien se queda sin fichas o no puede cubrir un pago pierde en el acto.
- **Desempate.** Si hay empate tras la ronda 12, se juegan 2 rondas (una en cada bando) con apuesta fija de 5, y se repite hasta que haya ganador.

El vocabulario completo está en [`GLOSSARY.md`](GLOSSARY.md).

## Desarrollo

Requiere Node 24.

```sh
npm install
npm run dev        # servidor de desarrollo
npm test           # tests (Vitest)
npm run typecheck  # comprobación de tipos
npm run build      # build estático en dist/
npm run sprites    # regenera los sprites en public/sprites/
```

Cada push a `main` ejecuta los tests y despliega el build en GitHub Pages (`.github/workflows/deploy.yml`).

## Estructura

- `src/motor/`: motor de reglas puro, sin React ni APIs del navegador. Se usa con `crearPartida(configuración, rng)`, `aplicar(estado, acción)`, `accionesLegales` y `vistaDeJugador`.
- `src/ia/`: la IA. `decidir(vistaDeJugador, rng)` devuelve una acción a partir de lo que ve su jugador, nunca del estado completo.
- `src/App.tsx`: la interfaz en React. Se ocupa de lo temporal: el tiempo límite, el retardo de la IA y la pausa tras los empates.
- `scripts/generar-sprites.mjs`: genera el pixel art. Para cambiar el arte basta con sustituir los PNG de `public/sprites/` manteniendo sus nombres.
- `docs/adr/`: decisiones de diseño.

Los identificadores del dominio están en español, con los términos del glosario ([ADR 0003](docs/adr/0003-codigo-en-espanol.md)).

## Arte

Todo el arte es propio y lo genera el script. La carpeta `references/` solo sirve como referencia local de estilo y no se versiona: en el repositorio no entra ninguna imagen de terceros ni ningún personaje del manga.
