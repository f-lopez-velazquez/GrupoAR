# GrupoAR

Aplicación web y stack Firebase para operación, catálogo público y utilidades internas de Grupo AR.

## Seguridad y credenciales

- Este repositorio no debe contener llaves privadas, service accounts ni `.env` reales.
- Los scripts administrativos usan `GRUPOAR_SERVICE_ACCOUNT_PATH` o `GOOGLE_APPLICATION_CREDENTIALS`.
- Las credenciales operativas sensibles deben inyectarse por variables de entorno.

## Arranque rápido

1. `npm install`
1. `firebase emulators:start`
1. Configurar `GRUPOAR_SERVICE_ACCOUNT_PATH` solo en entornos administrativos locales o CI privado.

## Estructura

- `fronted/`: frontend público y ERP.
- `functions/`: Cloud Functions y scripts operativos.
- `scripts/`: utilidades locales de administración y seed.

## Política de publicación

- Firebase client config pública puede existir en frontend; no es un secreto por sí misma.
- Nunca deben publicarse service accounts, tokens, contraseñas de seed ni credenciales de terceros.
- Revisa [SECURITY.md](SECURITY.md) antes de compartir cambios operativos.
