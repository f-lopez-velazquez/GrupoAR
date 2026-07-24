# Project Context & Documentation

> **GOLDEN RULE**: ESTE ARCHIVO DEBE ACTUALIZARSE CON CADA CAMBIO ESTRUCTURAL O DE CONFIGURACIÓN. ES LA FUENTE DE VERDAD PARA AGENTES Y DESARROLLADORES.

## Información General
- **Proyecto**: Grupo AR ERP & Prototypes
- **Tecnologías**:
  - Frontend: React 18 (Vite)
  - Backend/Serverless: Firebase Functions (Node.js 20)
  - Base de Datos: Firestore
  - Hosting: Firebase Hosting
- **Ubicación Principal**:
  - App React: `/fronted/erp`
  - Funciones: `/functions`
  - Prototipos Estáticos: `/fronted` (múltiples carpetas)

## Comandos Clave (Root)
El proyecto no tiene `package.json` en la raíz con scripts orquestadores. Se debe operar por subproyecto.

### Frontend (`/fronted/erp`)
- **Instalar**: `npm install`
- **Desarrollo**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Contexto**: El build genera `/dist`. La configuración de Firebase debe apuntar aquí para el módulo `/erp`.

### Módulos Principales
- **Evaluaciones**: `/evaluations` (Gestión de nómina y asistencia)
- **POS**: `/pos` (Punto de venta con toggle de vista lista/mosaico)
- **Usuarios**: `/admin/users` (Generación de gafetes y roles)

### Functions (`/functions`)
- **Instalar**: `npm install`
- **Lint**: `npm run lint`
- **Deploy**: `firebase deploy --only functions`

## Historial de Cambios Recientes
- **[2026-01-26] Corrección de Bug en Ventas**: Se corrigió error de sintaxis en `services/sales.js`.
- **[2026-01-26] Configuración de ESLint**: Se migró a ESLint 9 (Flat Config) en `fronted/erp` y `functions`.
- **[2026-01-26] Reparación de Build**: Se integró la carpeta `/shared` dentro de `/fronted/erp` para permitir builds autónomos.
- **[2026-01-26] Despliegue de Funcionalidades**:
  - Frontend (`/erp`): Actualizado ver `gpo-ar.web.app/erp`. Incluye POS Toggle, Evaluaciones y Gafetes.
  - Backend (`/functions`): **Atención**: Error de despliegue por permisos IAM en bucket. `deleteUser` y auditoría pueden fallar.
  - Inventario: Sembrado de datos reales completado.

## Configuración de Despliegue (Firebase)
- **Hosting URL**: `https://gpo-ar.web.app`
- **Hosting Public Dir**: `fronted`
- **Rewrites**: Múltiples rewrites para servir prototipos HTML.
- **Atención**: La aplicación React (`/erp`) requiere que `firebase.json` apunte a su build de producción o que se maneje el ruteo adecuadamente.

## Estructura de Directorios Clave
```
/
├── fronted/
│   ├── erp/           # Aplicación Principal React
│   │   ├── dist/      # Build de producción
│   │   └── src/
│   ├── shared/        # Scripts compartidos (legacy)
│   └── [prototipos]/  # ~50 carpetas de prototipos HTML
├── functions/         # Backend Firebase
├── firebase.json      # Configuración de hosting y emuladores
└── PROJECT_CONTEXT.md # ESTE ARCHIVO
```
