# Brainstorm de diseño — Biblioteca Digital Gamificada (v2: Minimalista B&N)

## Dirección elegida (por feedback del usuario): "Mono Library" — Minimalista blanco y negro aesthetic

**Design Movement**: Minimalismo editorial / brutalismo suave — inspirado en diseños tipo "aesthetic Tumblr", portadas de libro monocromáticas, tipografía bold, espacios generosos.

**Core Principles**:
1. Paleta estricta: solo blanco, negro y grises. Sin colores. La gamificación usa símbolos (estrellas, fuego) en negro/blanco.
2. Tipografía como protagonista: títulos enormes en bold, cuerpo limpio sans-serif.
3. Espacios generosos: mucho whitespace, bordes finos o inexistentes.
4. Contraste dramático: bloques negros sólidos contra fondo blanco puro.

**Color Philosophy**: Blanco puro (#FFFFFF) como fondo, negro (#000000) para texto y bloques sólidos, grises (#888, #DDD) para detalles secundarios. Nada más. La gamificación (XP, nivel, racha) se representa con iconos y números en negro.

**Layout Paradigm**: Asimétrico de dos columnas en escritorio: izquierda con panel del lector (nivel, XP, racha, búho), derecha con catálogo. En móvil, todo en una columna.

**Signature Elements**:
1. Bloques negros sólidos con texto blanco (headers, botones primarios).
2. Líneas divisorias finas (1px negro) como separadores.
3. Tipografía serif bold para títulos de libros + sans-serif para UI.

**Interaction Philosophy**: Hover = inversión de colores (bloque negro se vuelve blanco con borde negro). Las interacciones son limpias y directas.

**Animation**: Entradas fade-in simples, transiciones rápidas (150-200ms), confeti al terminar libro (negro/blanco/gris).

**Typography System**:
- Display/títulos: "Playfair Display" o "DM Serif Display" (serif bold, estética minimalista)
- Cuerpo/UI: "Inter" o "Space Grotesk" — limpio, geométrico, minimalista.
- Jerarquía: H1 extra bold, H2 bold, cuerpo regular.

**Brand Essence**: "BiblioQuest — tu biblioteca minimalista que te premia por leer"; estética limpia, moderna, sin distracciones.

**Brand Voice**: Directa, minimalista, sin adornos. Ejemplos:
- "Lee. Gana. Sube."
- "El próximo libro te espera."

**Wordmark & Logo**: "BiblioQuest" en serif bold, negro sobre blanco. Logo: búho minimalista en línea negra.

**Signature Brand Color**: Negro absoluto (oklch 0.15 0 0).

## Style Decisions (v2)

- Clasificación: los libros pueden etiquetarse por categoría (Ficción, No Ficción, Ciencia, Historia, etc.) desde el panel de admin o automáticamente por extensión.
- Filtros: el lector puede filtrar el catálogo por categoría.
- Título automático: se extrae del nombre del archivo al subir (ya implementado).
