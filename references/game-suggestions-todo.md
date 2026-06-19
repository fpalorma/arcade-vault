# Sugerencias de Juegos — Backlog

> Memoria persistente del agente `game-planner`. Lee este archivo antes de proponer
> cualquier juego; no reproponer slugs ya listados aquí.

**Estados:** `[ ]` propuesto · `[~]` aprobado · `[x]` implementado · `[-]` descartado

---

## Juegos ya en producción (no sugerir)

`asteroids` · `tetris` · `arkanoid` · `snake` · `rocas`

---

## Sugerencias

- [ ] **SPACE INVADERS** (`space-invaders`) — categoría: SHOOTER · color: yellow · origen: desde cero
  - Encaje: nave con movimiento horizontal (flechas) y disparo (espacio) contra formación de invasores que desciende; canvas 2D + RAF + teclado, mismo patrón que AsteroidsCanvas. Puntuación creciente y comparable entre partidas (high-score competitivo).
  - HUD: score (puntos por invasor + nave nodriza) / Vidas (naves restantes) / Oleada (nivel)
  - Aporta: primera categoría SHOOTER del catálogo; disparo vertical en formación con oleadas, mecánica distinta al disparo vectorial 360° de Asteroids.
  - Propuesto: 2026-06-19

- [ ] **GALAGA** (`galaga`) — categoría: SHOOTER · color: red · origen: desde cero
  - Encaje: nave fija abajo con movimiento horizontal (flechas) y disparo (espacio); enemigos entran en patrones curvos y se posicionan en formación, con picados de ataque. Canvas 2D + RAF + teclado, mismo patrón que AsteroidsCanvas. Puntuación clara y comparable (bonus por capturar/rescatar nave para doble disparo).
  - HUD: score (puntos por enemigo + bonus de captura) / Vidas (naves restantes) / Oleada (nivel)
  - Aporta: enemigos con trayectorias curvas y picados individuales (IA de vuelo), más dinámico que la formación rígida de Space Invaders; mecánica de captura/doble nave única en el catálogo.
  - Propuesto: 2026-06-19

- [ ] **CENTIPEDE** (`centipede`) — categoría: SHOOTER · color: orange · origen: desde cero
  - Encaje: tirador en una franja inferior con movimiento libre acotado (flechas) y disparo vertical (espacio) contra un ciempiés que serpentea por una rejilla de hongos; al impactar un segmento el ciempiés se divide. Canvas 2D + RAF + teclado. Puntuación creciente por segmentos, hongos y arañas.
  - HUD: score (segmentos + hongos + bichos) / Vidas (tiradores restantes) / Nivel (velocidad/oleada)
  - Aporta: campo de juego con obstáculos destructibles (hongos) y enemigo segmentado que se divide; mecánica de fragmentación inédita, distinta a formaciones y a Asteroids.
  - Propuesto: 2026-06-19

- [ ] **GRADIUS** (`gradius`) — categoría: SHOOTER · color: purple · origen: desde cero
  - Encaje: shooter de scroll horizontal; nave con movimiento libre en pantalla (flechas) y disparo (espacio) contra oleadas de enemigos y obstáculos del terreno que entran por la derecha. Canvas 2D + RAF + teclado. Puntuación por enemigos abatidos y power-ups recogidos.
  - HUD: score (enemigos + cápsulas de poder) / Vidas (naves restantes) / Fase (nivel)
  - Aporta: primer shoot'em up de scroll lateral del catálogo; movimiento 2D libre y sistema de power-up progresivo, mecánica distinta al disparo estático vertical.
  - Propuesto: 2026-06-19

- [ ] **1942** (`nineteen-42`) — categoría: SHOOTER · color: lime · origen: desde cero
  - Encaje: shooter de scroll vertical; avión con movimiento 2D acotado (flechas) y disparo hacia arriba (espacio) contra formaciones de aviones enemigos que descienden, con tonel/esquiva opcional. Canvas 2D + RAF + teclado. Puntuación por derribos y formaciones completas.
  - HUD: score (derribos + bonus de formación) / Vidas (aviones restantes) / Sortie (nivel)
  - Aporta: scroll vertical con oleadas en movimiento y maniobra de evasión (loop), complementa el scroll lateral de Gradius con un eje distinto; temática bélica retro coherente con CRT.
  - Propuesto: 2026-06-19

- [ ] **DEFENDER** (`defender`) — categoría: SHOOTER · color: teal · origen: desde cero
  - Encaje: nave con vuelo horizontal bidireccional sobre un terreno con scroll y minimapa; flechas para mover/elevar, espacio para disparar a los aliens que intentan abducir humanoides. Canvas 2D + RAF + teclado. Puntuación por aliens derribados y humanoides rescatados.
  - HUD: score (aliens + rescates) / Vidas (naves restantes) / Oleada (nivel)
  - Aporta: mundo con scroll bidireccional y objetivo doble (eliminar + proteger/rescatar), mecánica de defensa inédita frente al resto de shooters puramente ofensivos.
  - Propuesto: 2026-06-19

- [ ] **PAC-MAN** (`pac-man`) — categoría: MAZE · color: amber · origen: desde cero
  - Encaje: navegación por laberinto con 4 direcciones (flechas), comer puntos y huir/perseguir fantasmas; grid + RAF + teclado, sin física compleja. High-score claro y comparable (puntos + power pellets + fantasmas comidos).
  - HUD: score (puntos + power pellets + fantasmas) / Vidas (comecocos restantes) / Nivel (laberinto despejado)
  - Aporta: primera categoría MAZE del catálogo; IA de persecución/dispersión de fantasmas y exploración sin disparo, opuesta a todos los shooters actuales.
  - Propuesto: 2026-06-19

- [ ] **DIG DUG** (`dig-dug`) — categoría: MAZE · color: pink · origen: desde cero
  - Encaje: cavar túneles en una grid de tierra (flechas) y eliminar enemigos inflándolos (espacio) o aplastándolos con rocas que caen; movimiento por celdas, canvas 2D + RAF + teclado. Puntuación creciente y comparable.
  - HUD: score (enemigos reventados + rocas + profundidad) / Vidas (excavadores restantes) / Nivel (capa/profundidad)
  - Aporta: laberinto destructible que el propio jugador genera al cavar; mecánica de bombeo y caída de rocas, distinta del maze estático de Pac-Man.
  - Propuesto: 2026-06-19

- [ ] **FROGGER** (`frogger`) — categoría: MAZE · color: sky · origen: desde cero
  - Encaje: cruzar carriles de tráfico y un río saltando entre carriles y troncos (flechas), esquivando obstáculos en movimiento; grid por carriles + RAF + teclado, ideal para canvas. Score por avance y ranas salvadas.
  - HUD: score (avance + ranas en casa + bonus tiempo) / Vidas (ranas restantes) / Nivel (oleada de tráfico)
  - Aporta: navegación de timing y esquiva pura sin atacar; patrones de obstáculos móviles, variante distinta del laberinto cerrado.
  - Propuesto: 2026-06-19

- [ ] **BOMBERMAN** (`bomberman`) — categoría: MAZE · color: indigo · origen: desde cero
  - Encaje: moverse por una grid de bloques (flechas) y colocar bombas (espacio) para abrir camino y eliminar enemigos sin quedar atrapado en la explosión; celdas + RAF + teclado. High-score por enemigos, bloques y power-ups.
  - HUD: score (enemigos + bloques destruidos + power-ups) / Vidas (bombers restantes) / Nivel (sala despejada)
  - Aporta: laberinto destructible con riesgo propio (la bomba puede matarte); planificación táctica espacial, mecánica única en el catálogo.
  - Propuesto: 2026-06-19

- [ ] **DONKEY KONG** (`donkey-kong`) — categoría: PLATFORM · color: rose · origen: desde cero
  - Encaje: subir plataformas y escaleras (flechas) saltando barriles (espacio) hasta la cima; gravedad simple + colisión de plataformas, canvas 2D + RAF + teclado. Score por barriles saltados, altura y bonus.
  - HUD: score (saltos sobre barriles + bonus altura + items) / Vidas (Marios restantes) / Nivel (pantalla/escenario)
  - Aporta: primera categoría PLATFORM del catálogo; salto con gravedad, plataformas verticales y escalada, mecánica ausente hoy.
  - Propuesto: 2026-06-19

- [ ] **PONG** (`pong`) — categoría: SPORTS · color: gold · origen: desde cero
  - Encaje: paleta vertical controlada con flechas arriba/abajo contra una IA; pelota con física de rebote simple. Canvas 2D + RAF + teclado puro, sin assets, estética CRT de vectores planos. High-score = puntos/rallies acumulados antes de perder.
  - HUD: score (puntos del jugador o rallies encadenados) / Vidas (fallos restantes antes de game over) / Nivel (velocidad creciente de pelota e IA)
  - Aporta: primera categoría SPORTS del catálogo; mecánica de paleta + física de rebote 1v1, distinta a los SHOOTER, MAZE y PLATFORM ya en memoria. El más simple y rápido de implementar.

- [ ] **ROAD FIGHTER** (`road-fighter`) — categoría: RACING · color: crimson · origen: desde cero
  - Encaje: coche con movimiento horizontal (flechas) esquivando tráfico y bordes en una carretera con scroll vertical procedural; canvas 2D + RAF + teclado. Distancia recorrida sin chocar genera puntuación clara y comparable.
  - HUD: score (distancia/metros recorridos) / Vidas (choques restantes / combustible) / Nivel (tramo de pista, más velocidad y tráfico)
  - Aporta: primera categoría RACING; scroll vertical y esquiva a alta velocidad, sensación de progreso y velocidad ausente en todo el catálogo y la memoria.

- [ ] **PINBALL** (`pinball`) — categoría: PINBALL · color: violet · origen: desde cero
  - Encaje: bola con gravedad y rebotes sobre bumpers; dos flippers accionados con teclas izquierda/derecha. Física de colisiones en canvas 2D + RAF + teclado, vectores y luces planas CRT. Puntuación por impactos y combos, ideal para high-score.
  - HUD: score (puntos por bumpers/targets/combos) / Vidas (bolas restantes) / Nivel (multiplicador o mesa desbloqueada)
  - Aporta: primera categoría PINBALL; física de gravedad + flippers, mecánica única no compartida con ningún juego ni sugerencia previa.

- [ ] **KARATE CHAMP** (`karate-champ`) — categoría: FIGHTING · color: coral · origen: desde cero
  - Encaje: dos luchadores en arena lateral; jugador con flechas (acercar/alejar) y teclas de golpe (patada/puñetazo) contra IA. Animaciones por frames simples en canvas 2D + RAF + teclado. Puntuación por golpes acertados e ippons, comparable entre partidas.
  - HUD: score (puntos por golpes e ippons ganados) / Vidas (asaltos/energía restante) / Nivel (oponente, cada vez más rápido)
  - Aporta: primera categoría FIGHTING; combate 1v1 con timing y rango, mecánica de duelo inédita frente a los SHOOTER, MAZE y PLATFORM de la memoria.

- [ ] **PADDLEBALL TENNIS** (`tennis`) — categoría: SPORTS · color: turquoise · origen: desde cero
  - Encaje: vista cenital de pista; jugador mueve la raqueta (flechas en 2 ejes) y golpea con espacio para devolver la pelota a una IA con ángulos variables. Canvas 2D + RAF + teclado. Tantos ganados dan puntuación clara y competitiva.
  - HUD: score (juegos/tantos ganados) / Vidas (sets perdibles antes de game over) / Nivel (dificultad de la IA y velocidad de bola)
  - Aporta: refuerza SPORTS con una mecánica distinta a Pong: golpeo con ángulo y movimiento en dos ejes en lugar de paleta 1D.
  - Propuesto: 2026-06-19

- [ ] **COLUMNS** (`columns`) — categoría: PUZZLE · color: mint · origen: desde cero
  - Encaje: piezas de 3 gemas caen por una rejilla; el jugador las desplaza (flechas) y rota el orden de colores (espacio) para alinear 3+ del mismo color en horizontal, vertical o diagonal y eliminarlas con reacción en cadena. Canvas 2D + RAF + teclado sobre grid fijo, mismo patrón que TetrisCanvas. Score claro y comparable entre partidas.
  - HUD: score (gemas eliminadas + bonus de cadenas) / Joyas (gemas despejadas, análogo a "líneas" via onLives) / Nivel (velocidad de caída)
  - Aporta: puzzle match-3 por color con eliminación en diagonal y cascadas; mecánica distinta a Tetris (encaje de formas) pese a compartir el grid de caída.
  - Propuesto: 2026-06-19

- [ ] **DR. MARIO** (`dr-mario`) — categoría: PUZZLE · color: slate · origen: desde cero
  - Encaje: cápsulas bicolor caen sobre un frasco con virus; el jugador las mueve y rota (flechas + espacio) para alinear 4+ del mismo color y eliminar los virus. Grid de caída + detección de líneas de color, ideal para canvas 2D + RAF + teclado. La puntuación por virus eliminados es competitiva y comparable.
  - HUD: score (virus + cápsulas eliminados con bonus de combo) / Virus (restantes, via onLives) / Nivel (cantidad inicial de virus y velocidad)
  - Aporta: puzzle con objetivo de "limpiar" el tablero (no supervivencia infinita), piezas bicolor y rotación; mecánica distinta a Tetris y Columns.
  - Propuesto: 2026-06-19

- [ ] **PUYO POP** (`puyo-pop`) — categoría: PUZZLE · color: chartreuse · origen: desde cero
  - Encaje: pares de blobs caen y se apilan; conectar 4+ del mismo color (ortogonalmente) los revienta y desencadena cadenas en cascada que multiplican la puntuación. Física de caída simple sobre grid + flood-fill para detectar grupos: canvas 2D + RAF + teclado. High-score muy dependiente de cadenas, altamente competitivo.
  - HUD: score (blobs reventados x multiplicador de cadena) / Cadena (longitud de combo actual, via onLives) / Nivel (velocidad de caída)
  - Aporta: gravedad + reacción en cascada con flood-fill; el peso está en planificar cadenas, no en encajar formas. Estrategia distinta a Tetris, Columns y Dr. Mario.
  - Propuesto: 2026-06-19

- [ ] **PIPE DREAM** (`pipe-dream`) — categoría: STRATEGY · color: tangerine · origen: desde cero
  - Encaje: el jugador coloca tramos de tubería (cursor con flechas, confirmar con espacio) en una rejilla, contra el reloj, para guiar un flujo que arranca tras unos segundos; cuanto más larga la tubería antes de la fuga, más puntos. Grid + cursor + temporizador de flujo: canvas 2D + RAF + teclado. Puntuación por longitud de flujo, clara y comparable.
  - HUD: score (casillas atravesadas por el flujo + bonus de distancia) / Fugas (margen de fallo restante, via onLives) / Nivel (velocidad del flujo y tamaño de rejilla)
  - Aporta: primera categoría STRATEGY del catálogo; planificación de rutas bajo presión de tiempo en lugar de encajar/eliminar piezas que caen. Mecánica completamente nueva.
  - Propuesto: 2026-06-19

- [ ] **QBERT** (`qbert`) — categoría: PUZZLE · color: lavender · origen: desde cero
  - Encaje: personaje salta en diagonal (flechas) por una pirámide isométrica de cubos cambiando su color; completar todos los cubos avanza de nivel mientras se esquivan enemigos. Render isométrico de losas + saltos discretos: encaja en canvas 2D + RAF + teclado, paleta plana CRT. Score por cubos completados y bonus, competitivo.
  - HUD: score (cubos cambiados + bonus de ronda) / Vidas (saltos al vacío o enemigos) / Nivel (ronda/pirámide)
  - Aporta: puzzle de movimiento isométrico con esquiva, eje diagonal y perspectiva 2.5D inéditos en el catálogo; mezcla puzzle espacial y arcade de acción.
  - Propuesto: 2026-06-19
