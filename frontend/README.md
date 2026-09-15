# Frontend del sistema financiero

## Descripción

Interfaz web del simulador financiero. La base incluye navegación, acceso centralizado a la API, gestión de estado remoto y componentes reutilizables para desarrollar posteriormente las áreas pública, de clientes y administrativa.

## Tecnologías

| Tecnología | Versión declarada |
| --- | --- |
| React | 19.2.8 |
| TypeScript | 6.0.2 |
| Vite | 8.3.0 |
| Tailwind CSS | 4.3.3 |
| shadcn/ui | Componentes locales con estilo `new-york` |
| React Router DOM | 7.18.4 |
| TanStack Query | 5.102.8 |
| Axios | 1.20.0 |
| React Hook Form | 7.88.0 |
| Zod | 4.6.5 |

## Requisitos

Vite 8.3.0 declara compatibilidad con:

```text
Node.js ^20.19.0 o >=22.12.0
```

También se necesita npm, incluido normalmente con Node.js.

## Configuración inicial

Desde la carpeta `frontend/`, instala las dependencias y crea el archivo local de entorno:

```powershell
npm install
Copy-Item .env.example .env
```

Estos comandos están documentados para su ejecución posterior; la preparación inicial del repositorio no los ejecuta.

## Variables de entorno

| Variable | Descripción | Valor de desarrollo sugerido |
| --- | --- | --- |
| `VITE_API_BASE_URL` | URL base utilizada por la instancia central de Axios. | `http://localhost:8080/api` |

Solo las variables cuyo nombre comienza con `VITE_` se exponen al código del navegador. No almacenes secretos en ellas.

## Ejecutar frontend

```powershell
npm run dev
```

Normalmente estará disponible en `http://localhost:5173`.

## Build

```powershell
npm run build
```

El resultado de producción se generará en `dist/`.

## Estructura

```text
src/
├── app/
│   ├── providers/
│   └── router/
├── components/
│   ├── shared/
│   └── ui/
├── features/
├── lib/
├── pages/
├── types/
├── App.tsx
├── index.css
└── main.tsx
```

## Comunicación con backend

La instancia compartida de Axios está en `src/lib/api.ts` y obtiene su `baseURL` de `VITE_API_BASE_URL`. Para desarrollo, el backend está previsto en:

```text
http://localhost:8080/api
```

Los futuros servicios deben importar esa instancia en lugar de repetir la URL del backend. Los interceptores para autenticación se agregarán cuando exista el módulo de seguridad.

## Configuración de interfaz

- Tailwind CSS 4 está integrado mediante el plugin oficial de Vite.
- El alias `@/` apunta a `src/` tanto en Vite como en TypeScript.
- shadcn/ui utiliza variables CSS y una paleta sobria para el sistema financiero.
- `AppProviders` centraliza TanStack Query y las notificaciones de Sonner.
- El router contiene por ahora únicamente la ruta `/`.

## Problemas comunes

- **Versión incorrecta de Node:** usa una versión compatible con el requisito indicado arriba.
- **`node_modules` inexistente:** ejecuta `npm install` desde `frontend/`.
- **`.env` inexistente:** copia `.env.example` a `.env`.
- **Puerto 5173 ocupado:** Vite propondrá otro puerto o podrás configurarlo al iniciar.
- **Backend no disponible:** la interfaz podrá abrirse, pero cualquier futura petición a la API fallará hasta que el backend esté activo.
