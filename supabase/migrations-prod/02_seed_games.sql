-- ==========================================================
-- Arcade Vault — PROD seed: catálogo de juegos
--
-- Pegar y ejecutar en el SQL Editor del Dashboard de PRODUCCIÓN.
-- Ejecutar DESPUÉS de 01_schema_and_rls.sql.
-- Idempotente: se puede volver a correr sin duplicar filas.
-- ==========================================================

insert into public.games (id,title,short,long,cat,cover,color,best,plays) values
('arkanoid','ARKANOID','Rompe todos los bloques antes de perder tus vidas','Un clásico de bloques y rebotes. Controla la paleta con el teclado o el ratón, destruye los ladrillos y sobrevive los 3 niveles con patrones distintos. La velocidad aumenta cada ciclo.','ARCADE','cover-arkanoid','cyan',0,'0'),
('asteroids','ASTEROIDS','Pulveriza rocas espaciales en gravedad cero.','Tu nave triangular flota en el vacío absoluto. Dispara y rota para dividir asteroides en fragmentos cada vez más pequeños. Recoge el power-up de disparo triple y sobrevive oleada tras oleada.','SHOOTER','cover-rocas','cyan',41200,'15.6K'),
('frogger','FROGGER','Cruza la carretera y el río sin convertirte en papilla.','Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.','ARCADE','cover-frogger','lime',0,'0'),
('snake','SNAKE','Guía a la serpiente. Come frutas, no te muerdas la cola.','El clásico de los clásicos. Dirige la serpiente para devorar frutas, crece con cada bocado y evita chocar con las paredes o contigo mismo. ¿Hasta qué longitud puedes llegar?','ARCADE','cover-snake','green',0,'0'),
('tetris','TETRIS','Apila piezas, elimina líneas y desafía a la gravedad.','El clásico de los clásicos. Controla las piezas que caen, forma líneas completas y sobrevive el tiempo que puedas. Con powerups, ghost piece y velocidad que aumenta con cada nivel.','PUZZLE','cover-tetris','cyan',0,'0')
on conflict (id) do update set
  title=excluded.title, short=excluded.short, long=excluded.long,
  cat=excluded.cat, cover=excluded.cover, color=excluded.color,
  best=excluded.best, plays=excluded.plays;
