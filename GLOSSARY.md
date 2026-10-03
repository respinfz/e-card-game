# E-Card

Juego de cartas para dos jugadores basado en el E-Card del manga Kaiji: un bando con el Emperador y otro con el Esclavo se enfrentan con cartas boca abajo y apuestan fichas.

## Lenguaje

### Estructura de la partida

**Partida**:
Una sesión completa entre dos jugadores: 12 rondas más los bloques de desempate que hagan falta.
_Evitar_: Juego, sesión, match

**Bloque**:
Grupo de rondas seguidas en que los jugadores mantienen el mismo bando: 3 rondas en la partida normal y 2 en un desempate.
_Evitar_: Fase, tramo

**Ronda**:
Una apuesta, un reparto de manos y un único ganador. Se compone de 1 a 5 enfrentamientos.
_Evitar_: Turno, mano (cuando se refiere a la ronda)

**Enfrentamiento**:
Las dos cartas que los jugadores eligen en secreto y se revelan a la vez. Si salen dos Ciudadanos, se descartan y hay otro enfrentamiento.
_Evitar_: Turno, jugada, duelo

**Tiempo límite**:
Los 20 segundos que tiene un jugador para elegir carta en un enfrentamiento. Si se agotan, se juega por él una carta al azar de su mano.
_Evitar_: Timer, cuenta atrás

**Jugador A**:
El jugador que, por sorteo, es Emperador en el primer bloque y en la primera ronda de cada desempate.

**Desempate**:
Bloque de 2 rondas (una en cada bando) con apuesta fija de 5 fichas. Se juega si la partida termina empatada en fichas y se repite hasta que haya ganador.
_Evitar_: Muerte súbita, prórroga

### Cartas y bandos

**Bando**:
El papel que ocupa un jugador durante una ronda: Emperador o Esclavo. Determina qué mano recibe. Se dice "jugador Emperador" o "jugador Esclavo" para distinguirlo de la carta.
_Evitar_: Lado, equipo, rol, "el Esclavo" a secas

**Carta Emperador**:
Carta especial del bando Emperador. Vence al Ciudadano y pierde contra el Esclavo.

**Carta Esclavo**:
Carta especial del bando Esclavo. Vence solo al Emperador y pierde contra el Ciudadano.

**Carta Ciudadano**:
Carta común que tienen ambos bandos. Vence al Esclavo, pierde contra el Emperador y empata contra otro Ciudadano.

**Carta especial**:
La carta Emperador o la carta Esclavo. Cuando aparece una, la ronda termina.

**Mano**:
Las 5 cartas que recibe un jugador al empezar una ronda según su bando: su carta especial más 4 Ciudadanos.

### Fichas

**Ficha**:
Unidad de valor que se apuesta y se paga. Cada jugador empieza con 30.
_Evitar_: Moneda, punto, crédito

**Apuesta**:
Cantidad de fichas en juego en una ronda, que decide el jugador Esclavo antes de repartir: de 1 hasta 10, sin superar sus propias fichas.

**Multiplicador**:
Lo que paga el jugador Emperador cuando gana la carta Esclavo, expresado en veces la apuesta: ×4 (modo justo) o ×5 (modo manga). Se elige al crear la partida.

**Pago**:
Transferencia de fichas al terminar una ronda: el perdedor paga la apuesta ×1 si gana el Emperador, o ×4/×5 si gana el Esclavo.
