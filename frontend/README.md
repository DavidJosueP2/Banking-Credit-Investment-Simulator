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
| TanStack Table | 9.2.4 |
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
│   ├── data-table/
│   ├── layout/
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
- El router separa la futura zona pública (`/`), la estructura administrativa
  (`/admin`) y el laboratorio interno de tablas (`/dev/table`).

## Componentes UI

Los componentes base están disponibles localmente en `src/components/ui/` y
fueron agregados desde el registro actual de shadcn/ui. Los componentes propios
de cada módulo deben componerse a partir de esta biblioteca y utilizar
`lucide-react` como única fuente de iconos.

Sonner se utiliza para notificaciones. `Calendar` y `Popover` permiten componer
selectores de fecha cuando se necesiten; no se mantiene una copia separada de
recetas que el registro no publica como componente independiente.

La infraestructura de formularios queda preparada con React Hook Form, Zod,
`@hookform/resolvers` y el componente `Form` de shadcn/ui. Aún no hay formularios
de negocio.

## Data Tables

La carpeta `src/components/data-table/` combina la tabla semántica de shadcn/ui
con TanStack Table `9.2.4`. La implementación usa la API v9 (`useTable`,
`tableFeatures` y modelos `create*RowModel`) y ofrece:

- columnas tipadas y encabezados ordenables;
- búsqueda y filtros componibles;
- paginación y cambio de tamaño de página;
- visibilidad de columnas y selección de filas;
- acciones por fila con `DropdownMenu`;
- estados vacío y de carga con `Skeleton`;
- contenedor responsive con desplazamiento horizontal;
- paginación del lado del cliente y del servidor.

`DataTable<TData>` es independiente de las entidades del sistema. Para revisar
la integración con datos locales identificados como mock, usa `/dev/table`.

### Paginación del cliente

Usa `pagination={{ mode: 'client', initialPageSize: 10 }}` cuando ya se dispone
del conjunto completo. TanStack Table aplica localmente filtros, ordenamiento y
paginación.

### Paginación del backend

Usa el modo `server` con el estado controlado de `pagination`, `sorting` y
`columnFilters`, sus callbacks de cambio y el total `rowCount` o `pageCount`.
En este modo la tabla activa `manualPagination`, `manualSorting` y
`manualFiltering`; no realiza peticiones por sí sola ni procesa solamente la
página cargada como si fuera el conjunto completo.

El contrato esperado para Spring Boot será conceptualmente:

```text
?page=0&size=10&sort=nombre,asc
```

Los tipos `PageRequest`, `PageResponse<T>` y `ApiError` están en
`src/types/api.ts`. La consulta real y el contrato definitivo del backend aún
no están implementados.

## Estructura reutilizable

- `components/data-table/`: tabla genérica, toolbar, paginación, columnas,
  selección, acciones y skeleton.
- `components/layout/`: sidebar, header administrativo y `<Outlet />` para las
  rutas hijas.
- `components/shared/`: `PageHeader`, `StatusBadge` y `ConfirmDialog`.
- `lib/formatters.ts`: moneda USD, porcentajes, fechas y fecha/hora con locale
  `es-EC` mediante `Intl`.
- `app/providers/`: instancia única de `QueryClientProvider`, Tooltips y Sonner.
- `lib/api.ts`: instancia central de Axios basada en `VITE_API_BASE_URL`.

## Landing y acceso propuesto

La ruta `/` es la landing pública preliminar y presenta únicamente los futuros
simuladores de créditos e inversiones. `/admin` contiene el panel interno de
demostración y `/admin/roles` muestra la matriz detallada de permisos.

Los roles definidos en `src/app/access/permissions.ts` son:

| Rol | Alcance previsto |
| --- | --- |
| Visitante | Simular crédito e inversión y descargar reportes públicos. |
| Cliente | Lo público más solicitud de inversión, verificación de identidad, documentos y consulta de sus solicitudes. |
| Asesor de crédito | Panel interno, productos, tasas, cobros y solicitudes de crédito. |
| Asesor de inversiones | Panel interno, productos, tasas y solicitudes de inversión. |
| Administrador | Panel interno, ambas áreas de gestión, configuración institucional y asignación de roles. |

El selector “Vista de demostración” permite probar la navegación de cada rol;
inicia en administrador y guarda la selección solo en la sesión de la pestaña.
`PermissionGate` oculta rutas y controles de la interfaz según la matriz, pero
**no autentica a nadie ni protege datos**. Antes de conectar trámites reales, el
backend deberá identificar al usuario y verificar permisos en cada endpoint;
actualmente `SecurityConfig` permite todas las solicitudes. El rol nunca deberá
aceptarse como autoridad solo porque venga del navegador.

## Tipografía

El sistema utiliza exclusivamente dos familias, servidas localmente mediante Fontsource:

- `font-heading`: Libre Baskerville 400 para títulos y encabezados.
- `font-sans`: Inter 400/500 para texto, navegación, formularios y tablas.

Los elementos `h1`, `h2`, `h3` y los títulos base de shadcn/ui reciben automáticamente la tipografía de encabezado. Los importes y demás datos tabulares utilizan cifras de ancho uniforme.

## Problemas comunes

- **Versión incorrecta de Node:** usa una versión compatible con el requisito indicado arriba.
- **`node_modules` inexistente:** ejecuta `npm install` desde `frontend/`.
- **`.env` inexistente:** copia `.env.example` a `.env`.
- **Puerto 5173 ocupado:** Vite propondrá otro puerto o podrás configurarlo al iniciar.
- **Backend no disponible:** la interfaz podrá abrirse, pero cualquier futura petición a la API fallará hasta que el backend esté activo.
