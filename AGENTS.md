# Merken — contexto actual

Actualizado: 2026-11-15. Dashboard de control terrestre para el proyecto NASA Space Apps. La app móvil y el backend son trabajos separados del equipo; aquí se mantiene el frontend existente.

## Proyecto y acceso

- Repositorio: https://github.com/jere-shawow/Frontend-Deploy-con-Merken
- Rama de producción: `main`.
- Web: https://deployconmerken.gabogrobier.dev — entrada por `/login`.
- Stack: Next.js 16, React 19, lucide-react, CSS y Docker ARM64.
- Trabajar desde la raíz del repositorio disponible. No depender de workdirs, copias de respaldo ni rutas absolutas de un PC específico; no crear worktrees para este flujo.
- Usuario de demostración: `demo`. La contraseña y el secreto de sesión se consultan en la configuración de ejecución; no guardarlos en Git ni en este archivo.

## Estado del dashboard

- Máximo de 7 astronautas visibles: prioridad para Gabo/Garmin y luego perfiles simulados con historial. La selección no modifica el roster del backend.
- Gabo conserva los datos reales del backend. Nunca sustituir sus lecturas por curvas simuladas. El resto se identifica explícitamente como simulado.
- Overview muestra tripulación, pulso y mood junto al nombre, señales, un gráfico seleccionable, lecturas y avisos. Los selectores de astronautas usan tarjetas visibles.
- Moods en inglés, con icono y color según el valor recibido. Los scores conservan su escala. No inventar cambios de estado para Gabo.
- Body map: la imagen aprobada y definitiva es `public/resources/person-example.png`, entregada mediante Next Image. Sus puntos reaccionan a `metricStatuses`: normal, warning, critical o unknown. Sin evaluación del backend, mostrar gris; no inferir diagnósticos.
- Gráficos: ventanas de 7/14/todas las lecturas, período real cuando hay timestamps y tag negro redondeado con triángulo superior para el valor bajo el cursor. Los historiales adicionales se despliegan bajo demanda.
- El diseño inspirado en `idea.jpg` sigue siendo provisional: `app/reference-effects.css`, acotado a `reference-preview`. Mantener paleta y fuentes de Merken. Las tarjetas de señales de Overview ya no llevan flechas.
- Evitar bloques que repitan el perfil seleccionado y mantener diseño responsivo, compacto y ligero. No añadir librerías de efectos innecesarias.
- Notificaciones: filtros, contador, descarte y horas de envío/recepción con zona horaria. Avisos creados desde el dashboard, descartes y registros diarios/manuales permanecen en el navegador; no se envían a la app móvil.

## Datos y límites conocidos

- `MERKEN_ASTRONAUTS_URL`: origen del directorio y valores actuales, incluida la vinculación Garmin de Gabo.
- `MERKEN_TELEMETRY_URL` y `MERKEN_TELEMETRY_TOKEN`: feed de mediciones/historial. En producción se utilizan las conexiones existentes entre servicios.
- La combinación de fuentes está en `lib/dashboard-crew.js`; la selección de los 7 perfiles y presentación de moods, en `lib/crew-display.js`.
- Las observaciones de valores actuales se guardan en memoria del servidor, hasta 288 por métrica; se reinician al reiniciar el proceso. Son observaciones del dashboard, no mediciones históricas reconstruidas de Garmin.
- El frontend actualiza los datos cada minuto. Una falla del upstream debe ser visible; no sustituir silenciosamente datos reales por datos demo.
- Specialist conserva la integración de informes JSON y revisiones. Los informes del servicio de telemetría requieren IDs compatibles y soporte del backend; consultar su documentación antes de modificar contratos.
- No modificar el backend, bases de datos ni sincronizadores de Garmin/simulador sin una instrucción concreta del usuario.

## Validación y publicación

- Pruebas: `node --test lib/*.test.mjs`.
- Build equivalente al contenedor: `NEXT_STANDALONE=1 npm run build` (adaptar la sintaxis de variable al shell).
- Conservar autenticación del servidor: cookie firmada HTTP-only, rutas protegidas y logout. `/login` responde 200, `/` sin sesión redirige 307 y `/api/dashboard` sin sesión responde 401.
- Publicar mediante push a `main` y GitHub Actions; mantener Docker ARM64. No reemplazar CI/CD por copias o builds manuales en EC2.
- Workflow: `.github/workflows/frontend.yml`. Construye y prueba la imagen, y despliega la misma imagen mediante GitHub OIDC + AWS SSM cuando `EC2_DEPLOY_ENABLED=true`. Consultar `deploy/README.md`.
- El despliegue preserva Compose, las variables de ejecución y el rollback del host. El contenedor usa puerto 3000 y el front se publica en `127.0.0.1:3001` detrás del proxy HTTPS existente.
- Configuración del front en EC2: `/docker/front-web/runtime.env`. No incluir `.env*`, tokens, claves SSH o credenciales AWS en Git ni en imágenes.
- Para dar el despliegue por terminado, comprobar el resultado de Actions, la revisión que ejecuta el contenedor, el login público y los datos de Gabo junto con los perfiles simulados.

## Próximos objetivos

Pendientes de que el usuario los añada.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
