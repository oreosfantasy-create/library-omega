# Library Omega — paquete para Vercel

Este paquete contiene una copia ordenada de **Library Omega** con frontend React/Vite y una función Express/tRPC para Vercel. Conserva el lector EPUB/PDF, libros, Perfil, XP, niveles, racha, autenticación y almacenamiento configurado por el proyecto. El logo gatito + Ω se incluye localmente en `client/public/library-omega-cat.png`, por lo que no depende de Manus Storage para mostrarse.

> **Importante:** Vercel puede ejecutar la función API, pero el proyecto depende de una base de datos MySQL/TiDB, OAuth Manus y el proxy de almacenamiento Manus. Debes configurar esas variables en Vercel. Para una publicación sin adaptar infraestructura, el hosting integrado de Manus es la opción más directa y compatible.

## 1. Ejecutar localmente

Requisitos: Node.js 20 o superior y pnpm 10 o superior.

```bash
pnpm install
cp .env.example .env
# Completa .env con tus valores reales
pnpm run check
pnpm test
pnpm run build
pnpm run dev
```

La aplicación local se abrirá en `http://localhost:3000`.

## 2. Variables de Vercel

Copia todas las variables de `.env.example` en **Vercel → Project Settings → Environment Variables**. Usa los valores reales solo en Vercel y nunca los subas al repositorio.

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión MySQL/TiDB para usuarios, libros, progreso y reseñas. |
| `JWT_SECRET` | Firma de sesiones. Debe ser un secreto largo y aleatorio. |
| `VITE_APP_ID` | Identificador de la aplicación OAuth. |
| `OAUTH_SERVER_URL` | Servidor OAuth de Manus. |
| `VITE_OAUTH_PORTAL_URL` | Portal de inicio de sesión mostrado al usuario. |
| `OWNER_OPEN_ID` / `OWNER_NAME` | Identidad del propietario y permisos administrativos. |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Proxy server-side para almacenamiento Manus. |
| `VITE_FRONTEND_FORGE_API_URL` / `VITE_FRONTEND_FORGE_API_KEY` | Acceso frontend a servicios Manus cuando el código lo requiere. |
| `VITE_APP_TITLE` / `VITE_APP_LOGO` | Branding opcional. |

Configura las variables para **Production**, **Preview** y **Development** según corresponda. No pegues secretos en archivos públicos.

## 3. Base de datos

La base de datos debe ser MySQL/TiDB accesible desde Vercel y con SSL habilitado cuando el proveedor lo requiera. Desde el directorio del proyecto puedes generar migraciones con:

```bash
pnpm drizzle-kit generate
```

Aplica las migraciones con el mecanismo seguro de tu proveedor. No elimines tablas existentes si contienen libros, usuarios o progreso.

## 4. OAuth

En el proveedor OAuth registra las URLs del dominio de Vercel para el callback. El valor de `VITE_APP_ID` debe ser el identificador de la aplicación Manus que habilita Google y `VITE_OAUTH_PORTAL_URL` debe ser la URL base del portal OAuth, no la URL de tu sitio:

```text
https://TU-PROYECTO.vercel.app/api/oauth/callback
```

También añade el dominio personalizado si utilizas uno. El flujo usa una cookie `__Host-oauth_state`, por lo que el sitio debe ejecutarse con HTTPS. Después de cambiar variables OAuth debes volver a desplegar, porque las variables `VITE_*` se incorporan durante el build frontend. Si aparece el aviso de OAuth no configurado, falta `VITE_APP_ID` o `VITE_OAUTH_PORTAL_URL` en el entorno de build. El callback se genera automáticamente con `window.location.origin`, así que no debes fijar manualmente el dominio dentro del código.

## 5. Desplegar desde Vercel

Puedes importar el ZIP como repositorio o descomprimirlo y subir su contenido a un repositorio privado. En la configuración del proyecto usa:

```text
Framework Preset: Vite
Build Command: pnpm run vercel-build
Output Directory: dist/public
Install Command: pnpm install
```

Después de configurar variables y OAuth, ejecuta un deploy. Comprueba primero `/api/health`, luego el inicio de sesión, la carga de libros y la lectura desde otro dispositivo.

## 6. Limitación importante de cargas

Las funciones serverless tienen límites de tamaño, duración y memoria que pueden variar según el plan de Vercel. Los libros grandes pueden superar esos límites si se envían a través de una función. Para cargas masivas o archivos grandes, usa el almacenamiento Manus/S3 mediante URLs firmadas o el hosting integrado de Manus.

## 7. Estructura añadida para Vercel

- `api/index.ts`: función Express que expone OAuth, tRPC, almacenamiento y `/api/health`.
- `client/public/library-omega-cat.png`: logo local gatito + Ω usado por la marca, favicon y manifest.
- `vercel.json`: rewrites para API, almacenamiento y rutas SPA.
- `.env.example`: plantilla sin secretos.
- `README-VERCEL.md`: esta guía.

El paquete no incluye `node_modules`, `dist`, logs, secretos ni archivos `.env`.
