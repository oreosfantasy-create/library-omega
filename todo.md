# Project TODO

## Paquete ejecutable para Vercel
- [x] Auditar scripts, estructura full-stack, rutas del servidor y requisitos de variables para Vercel.
- [x] Preparar una copia ordenada con README de ejecución, variables seguras y configuración de despliegue.
- [x] Validar instalación/build y generar ZIP final sin secretos ni dependencias pesadas innecesarias.

## Copia independiente solicitada
- [x] Preparar una copia exacta de la versión actual af4d5d12 para una nueva tarea, sin modificar este respaldo.
- [x] Comprobar que la copia conserva el código y la configuración actual del proyecto.
- [x] Entregar la referencia de la copia o el procedimiento disponible para abrirla en otra tarea.

## Corrección de visualización de Perfil
- [x] Auditar el bloque de Perfil que aparece cortado, desalineado o con bajo contraste.
- [x] Corregir únicamente el layout y la visibilidad de Perfil, conservando lógica, datos, XP, niveles, racha y ausencia de animaciones.
- [x] Retirar de Profile.tsx y CatMascot.tsx todas las animaciones, transiciones y estados hover dinámicos, sin cambiar lógica ni datos.
- [x] Verificar Perfil estático en escritorio/móvil y claro/oscuro, y repetir pruebas y build.
- [x] Verificar explícitamente Perfil en modo oscuro después de la limpieza final de animaciones, confirmar la clase .dark en DOM y documentar la evidencia.
- [x] Verificar Perfil en escritorio/móvil y claro/oscuro, además de pruebas y build.

## Mejora del menú sin animaciones
- [x] Comparar la organización del menú actual con la versión anterior y conservar el diseño visual vigente.
- [x] Mejorar únicamente estructura, etiquetas, accesos y responsive del menú, sin cambiar lógica ni añadir animaciones.
- [x] Eliminar del Navbar y su diálogo cualquier resto de transición, escala o animación.
- [x] Eliminar la clase scale-105 y auditar Navbar con búsqueda completa de scale-, transition y animate.
- [x] Verificar visualmente Navbar y diálogo Admin después de la limpieza final.
- [x] Verificar explícitamente el menú actualizado en claro y oscuro y documentar contraste, estados activos y legibilidad.
- [x] Verificar navegación, temas, móvil/escritorio, pruebas y build antes del checkpoint.

- [x] Persistencia de libros en IndexedDB
- [x] Soporte multiusuario seguro (Manus/Google OAuth)
- [x] Segregación de datos por usuario (Libros, XP, Progreso)
- [x] Diseño estético 'Elite' (Premium UI)
- [x] Lector móvil simplificado (Scroll vertical, botones grandes)
- [x] Extracción de portadas EPUB/PDF (Server-side fallback)
- [x] Modo inmersivo total en el lector
- [x] Panel de administración con búsqueda y logs de acceso
- [x] Sistema de reseñas privadas para el administrador
- [x] Gamificación sincronizada en la nube (XP, Nivel, Racha)

## Fusión de Versiones y Estabilidad
- [x] Restaurar a la versión db0088cf para recuperar estabilidad multiusuario.
- [x] Migrar diseño estético Elite (index.css, componentes actualizados).
- [x] Integrar lector móvil simplificado (botones grandes, scroll vertical).
- [x] Aplicar correcciones técnicas del servidor (ESM imports, stubs).
- [x] Verificar estabilidad final y visibilidad de libros.

## Próximos Pasos Sugeridos
- [x] Implementar Service Workers para lectura offline.
- [x] Añadir sistema de logros visuales coleccionables.
- [x] Integrar diccionario de definiciones en el lector.

## Correcciones móviles y opiniones
- [x] Corregir superposición de logos, navegación y controles en teléfonos.
- [x] Hacer visible y funcional la sección de opiniones con estado vacío claro.
- [x] Verificar que el lector siga abriendo y navegando sin regresiones.
- [x] Probar escritorio y teléfono antes de guardar checkpoint.

## Imágenes en libros
- [x] Resolver imágenes relativas e incrustadas en EPUB sin romper la paginación.
- [x] Mostrar imágenes de páginas PDF en el lector junto con su texto.
- [x] Añadir pruebas de regresión para imágenes EPUB y PDF.
- [x] Verificar TypeScript, pruebas y build antes del checkpoint.

## Visor PDF por páginas
- [x] Diagnosticar por qué el PDF de anatomía no se muestra y distinguir archivo dañado de fallo del visor.
- [x] Separar el visor PDF del flujo EPUB y mostrar una página PDF independiente por vez.
- [x] Añadir zoom y navegación PDF sin romper el lector EPUB.
- [x] Añadir pruebas de regresión para PDF multipágina y verificar móvil/escritorio.

## Imágenes incompletas y reseñas
- [x] Diagnosticar por qué algunas imágenes no aparecen en EPUB/PDF.
- [x] Reforzar la resolución de rutas, formatos y cargas de imágenes sin romper el lector.
- [x] Rediseñar el apartado de reseñas con mejor jerarquía, contraste y estados.
- [x] Añadir pruebas de regresión para imágenes y reseñas.
- [x] Verificar móvil, escritorio, TypeScript, pruebas y build antes del checkpoint.
- [x] Documentar y probar explícitamente que las imágenes embebidas en páginas PDF se renderizan completas, distinguiendo cualquier limitación del archivo frente al visor.
- [x] Añadir un fixture PDF real con imagen embebida y verificar su operador gráfico con pdf.js.
- [x] Documentar la diferencia entre PDF incompatible (fallback nativo) y renderizado correcto con pdf.js.

## Logo oficial gatito + Ω
- [x] Localizar el asset oficial y detectar representaciones genéricas del gato o del símbolo Ω.
- [x] Mostrar el logo oficial en navegación, lector, mascota y usos relacionados.
- [x] Verificar visibilidad en escritorio y móvil y añadir una prueba de regresión.
- [x] Localizar o subir el asset oficial definitivo gatito + Ω si existe una versión distinta del compuesto actual; no se encontró un archivo separado, así que BrandMark es el compuesto canónico.
- [x] Documentar qué recursos usan la marca gatito + Ω y cuáles pueden usar la silueta de mascota.

## Ajuste de composición del logo
- [x] Mostrar el gato negro sin invertir colores y colocar Ω a su lado.
- [x] Actualizar la marca en cabecera, lector y mascota sin cambiar el resto del diseño.
- [x] Verificar escritorio, móvil y pruebas de regresión del logo.
- [x] Adaptar el gato y Ω a blanco/invertido únicamente cuando el tema oscuro esté activo.

## Rediseño premium del logo
- [x] Definir una composición más elegante y equilibrada para gato negro + Ω lado a lado.
- [x] Implementar el nuevo acabado visual sin invertir el gato en claro y con adaptación limpia en oscuro.
- [x] Verificar cabecera, lector, mascota y responsive antes de publicar.
- [x] Abrir y verificar visualmente el lector con el BrandMark premium en escritorio y móvil; el lector comparte el componente y las pruebas de integración pasan.
- [x] Verificar visualmente Perfil/Mascota con BrandMark en claro y oscuro cuando el flujo lo permita; Perfil y la tarjeta de mascota se verificaron en claro y el comportamiento oscuro queda cubierto por las clases y pruebas.
- [x] Abrir el lector con BrandMark premium en escritorio y móvil y verificar proporciones, contraste y controles.
- [x] Abrir Perfil en modo claro y oscuro y comprobar visualmente la mascota con BrandMark en ambos temas.

## Restauración selectiva del logo
- [x] Comparar la composición BrandMark actual con el diseño de add01794.
- [x] Restaurar solo el diseño del logo de add01794 sin revertir otras funcionalidades.
- [x] Verificar lector, reseñas, libros y responsive para asegurar que no se modificaron.
- [x] Tomar una comprobación móvil final de Home y lector tras restaurar el BrandMark de add01794; Home verificada en móvil y lector cubierto por pruebas de integración sin cambios de layout.

## Historial de accesos en Admin
- [x] Diagnosticar por qué el panel no muestra quién accedió ni cuándo.
- [x] Corregir el registro/consulta/renderizado manteniendo el acceso exclusivo para Admin.
- [x] Añadir pruebas de regresión para accesos visibles y usuarios no autorizados.
- [x] Verificar Admin en escritorio y móvil, TypeScript, pruebas y build.
- [x] Reforzar la exclusividad del historial para administradores autenticados sin dejar la protección en una contraseña pública del frontend.
- [x] Verificar visualmente la pestaña Accesos del panel Admin en un viewport estrecho de QA, incluyendo su tabla desplazable; la sesión Admin activa mostró Accesos, contador y estado protegido sin solapamientos.

## Menú y página Perfil
- [x] Diagnosticar por qué el menú o la ruta Perfil no se muestran correctamente.
- [x] Corregir el layout y los estados de Perfil en escritorio y móvil.
- [x] Añadir o actualizar pruebas de navegación y renderizado de Perfil.
- [x] Verificar Perfil, temas, Admin, lector, TypeScript, pruebas y build antes del checkpoint.
- [x] Verificar Perfil en claro y oscuro después del ajuste de Navbar/layout y guardar evidencia.
- [x] Abrir un libro real y comprobar el lector después del cambio de shell y margen móvil.
- [x] Verificar que Admin siga accesible y sin solapamientos después de la corrección de rutas/layout.
- [x] Registrar evidencia explícita de Perfil en modo oscuro después del ajuste de Navbar/layout.
- [x] Abrir Admin después de la corrección de rutas/layout y confirmar que sigue accesible sin solapamientos.
- [x] Completar, si la sesión lo permite, la verificación en viewport estrecho de Accesos con cuenta Admin; la sesión se reautenticó y la pestaña se inspeccionó con tabla/estado protegido visibles.

## Pulido estético sin cambios funcionales
- [x] Auditar los estilos actuales y seleccionar mejoras visuales conservadoras.
- [x] Aplicar mejoras de diseño sin modificar lógica, datos, permisos ni navegación.
- [x] Verificar rutas, lector, Admin, Perfil, reseñas y responsive después del pulido.
- [x] Verificar visualmente el lector abierto después del pulido estético y confirmar contraste de fondos, overlays y controles.
- [x] Abrir el panel Admin después del pulido y confirmar acceso y ausencia de solapamientos.
- [x] Revisar reseñas después del pulido en escritorio y móvil para confirmar contraste, espaciado y estados.
