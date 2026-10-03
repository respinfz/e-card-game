# La carta al azar usa una semilla guardada en el estado

La spec pide que toda la aleatoriedad venga del `rng` inyectado en `crearPartida`, pero `aplicar(estado, acción)` no recibe ningún `rng`, y guardar la función en el estado lo haría no serializable (ADR 0002). Por eso `crearPartida` usa el `rng` para el sorteo y para sacar una semilla, que se guarda en el estado. `JugarCartaAlAzar` usa un generador determinista (mulberry32) con esa semilla y la avanza. El motor sigue siendo puro y determinista en los tests: el mismo `rng` produce la misma partida.
