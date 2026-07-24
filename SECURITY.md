# Seguridad

Si detectas una vulnerabilidad, exposición de datos o una práctica insegura, evita abrir un issue público con detalles explotables.

## Reporte responsable

- Correo: `f.lopezvelazquez@ugto.mx`

## Reglas de higiene

- No subir `.env`, credenciales, service accounts, tokens OAuth ni bases de datos locales.
- Usar `GRUPOAR_SERVICE_ACCOUNT_PATH` o `GOOGLE_APPLICATION_CREDENTIALS` para scripts administrativos.
- Mantener cualquier password de seed fuera del código y solo en variables de entorno.
- Revisar secretos y dependencias antes de cada push.
