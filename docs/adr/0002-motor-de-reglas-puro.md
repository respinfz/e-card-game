# Motor de reglas puro, separado de la interfaz

Las reglas (rondas, enfrentamientos, apuestas, pagos, fin de partida) viven en un módulo TypeScript sin dependencias de React ni del navegador, con un estado serializable. La primera versión es humano contra IA y solo en el cliente, pero así el motor se prueba con TDD, la IA es un jugador más detrás de una interfaz pequeña y un modo online o el guardado de partidas se pueden añadir después sin reescribir las reglas.
