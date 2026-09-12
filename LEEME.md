# Library Ωmega — Biblioteca Digital Gamificada

Biblioteca digital minimalista en blanco y negro con gamificación, mascota gato que evoluciona por nivel y panel de administración protegido por contraseña.

## Cómo ejecutar en otra computadora

1. Instala [Node.js](https://nodejs.org/) (versión 18 o superior) si no lo tienes.
2. Descomprime este ZIP en la carpeta que quieras.
3. Abre una terminal (o la consola de comandos) dentro de la carpeta `biblioteca-gamificada`.
4. Ejecuta estos comandos en orden:

```bash
npm install
npm run dev
```

5. Abre tu navegador en la dirección que aparece en la terminal, normalmente:

```
http://localhost:5173
```

## Crear la versión final (opcional)

Si quieres un archivo `dist/` listo para publicar o abrir en cualquier hosting estático:

```bash
npm run build
```

El resultado queda en la carpeta `dist`.

## Funciones principales

| Función | Detalle |
|---|---|
| Modo Lector (por defecto) | Solo ven, leen y descargan los libros que el admin subió. No pueden subir ni borrar nada. |
| Modo Admin | Protegido con contraseña. Sube PDF/EPUB, clasifica por categoría y borra libros. |
| Contraseña de admin | `omega2024` (cámbiala en `client/src/components/Navbar.tsx`, línea ~11) |
| Título automático | Al subir un libro, el título se extrae del nombre del archivo. |
| Portadas automáticas | En los EPUB se extrae la portada del archivo; en los PDF se genera una portada minimalista. |
| Visor integrado | Lee PDF y EPUB directamente en la app, sin salir. |
| Descarga | Botón "Descargar" en el visor para cualquier usuario (lector o admin). |
| Gamificación | XP por terminar libros (+100 XP), racha diaria, niveles 1 a 20 (50 XP por nivel). |
| Mascota gato | Silueta idéntica a la referencia, cambia de color por nivel (hasta 20 niveles). |
| Clasificación | Categorías editables por el admin (Ficción, Ciencia, Historia, etc.). |

## Importante sobre los libros y otra computadora

Los libros se guardan en el **navegador** (localStorage), no en la carpeta. Esto significa:

- Si mueves esta carpeta a otra computadora y ejecutas la app ahí, el código funciona perfectamente, pero la biblioteca estará vacía al inicio.
- El admin de cada computadora debe subir sus libros una sola vez en ese navegador, y desde entonces todos los lectores en ese navegador los verán.
- Es el comportamiento diseñado para una app sin servidor, 100% local y portátil.

## Estructura del proyecto

```
biblioteca-gamificada/
├── client/src/components/   Componentes visuales (mascota, navbar, visor, panel admin)
├── client/src/pages/        Páginas (Home)
├── client/src/lib/          Lógica de la biblioteca, XP y niveles
├── client/public/           Favicon y archivos públicos
├── package.json             Dependencias y scripts
└── LEEME.md                 Este archivo
```

## Cambiar la contraseña del admin

Abre `client/src/components/Navbar.tsx` y edita la línea:

```ts
const ADMIN_PASSWORD = "omega2024";
```
