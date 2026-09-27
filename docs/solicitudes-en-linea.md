# Solicitudes en línea

Responsable: David Manjarres. Este módulo convierte una simulación pública en una solicitud autenticada y la lleva hasta la decisión de un asesor. No calcula nada por su cuenta: consume los simuladores de Créditos e Inversiones y la verificación de identidad.

## Recorrido

```text
Simulador público → PDF sin cuenta → "Solicitar" / "Guardar simulación"
  → login o registro (la simulación se conserva)
  → verificación de requisitos (cuenta de cliente, correo, identidad)
  → datos de la solicitud y consentimiento → borrador
  → documentos opcionales → prueba de vida (firma biométrica) → enviada
  → asesor: tomar → pedir información / recomendar (o decidir dentro de su atribución)
  → analista de crédito: aprobar / rechazar / devolver al asesor
  → cliente: seguimiento, responder observaciones, "Mis productos" con cronograma
```

## Estados

| Estado | Quién lo produce | Siguiente |
| --- | --- | --- |
| `DRAFT` (Por confirmar) | Cliente crea la solicitud | `SUBMITTED` al pasar la biometría, `CANCELLED` |
| `SUBMITTED` (Enviada) | Biometría `APPROVED` o `MANUAL_REVIEW`; respuesta a observación | `IN_REVIEW`, `CANCELLED` |
| `IN_REVIEW` (En revisión) | Asesor toma la solicitud; analista la devuelve | `PENDING_APPROVAL`, `OBSERVED`; `APPROVED`/`REJECTED` solo inversiones o créditos dentro de la atribución |
| `PENDING_APPROVAL` (En aprobación) | Asesor de crédito recomienda aprobar o rechazar | `APPROVED`, `REJECTED`, `IN_REVIEW` (devuelta) |
| `OBSERVED` (Con observaciones) | Asesor pide información (comentario obligatorio) | `SUBMITTED` cuando el cliente responde, `CANCELLED` |
| `APPROVED` / `REJECTED` / `CANCELLED` | Finales | — |

## Roles y separación de funciones

| Rol | Créditos | Inversiones |
| --- | --- | --- |
| Asesor de crédito (`credit.requests.review`) | Toma, pide información, recomienda. Aprueba o rechaza solo si el monto está dentro de su atribución y la biometría fue `APPROVED`. | — |
| Analista de crédito (`credit.requests.approve`) | Aprueba, rechaza o devuelve lo recomendado. No puede tomar solicitudes ni decidir una que haya revisado o recomendado. | — |
| Asesor de inversiones (`investment.requests.review`) | — | Toma, pide información, aprueba o rechaza. |
| Administrador (`requests.audit`) | Solo consulta. | Solo consulta. |

La atribución del asesor es `credit.advisorApprovalLimit` en Configuración → Créditos (2000 USD por defecto; 0 obliga a que todo pase por el analista). El servidor calcula qué acciones puede hacer cada persona (`actions` en el detalle de revisión) y la interfaz solo las muestra. La recomendación del asesor y las devoluciones del analista son notas internas: el cliente ve el cambio de estado pero no el comentario.

Reglas que aplica el servidor:

- Solo se puede tener una solicitud abierta por producto (índice único parcial en BD).
- Un asesor no puede revisar su propia solicitud.
- Rechazar, observar, recomendar y devolver exigen comentario. Aprobar exige comentario si la biometría fue `MANUAL_REVIEW` o si el analista aprueba contra una recomendación de rechazo.
- Al aprobar, las fechas del cronograma se corren al día de aprobación.
- Cada cambio de estado queda en `application_events` y se muestra como línea de tiempo al cliente y al asesor.

## Integración con los otros módulos

| Módulo | Qué se consume | Dónde |
| --- | --- | --- |
| Créditos (Carol) | `SimuladorService.simularCliente` y `obtenerProductosDisponibles` | `application/ScenarioCalculator.java` |
| Inversiones (Joel) | `InvestmentService.simulate` | `application/ScenarioCalculator.java` |
| Identidad (Josue) | `customer_profiles`, `customer_biometrics`, `identity_documents`, `LivenessService.verify` | `application/ApplicationService.java` |

- **Cálculo**: el navegador solo envía los parámetros (producto, monto, plazo, sistema o frecuencia de pago). El servidor vuelve a calcular con el servicio dueño y guarda una copia de las cifras y del cronograma (`application_schedule`). Si Créditos o Inversiones cambian su fórmula, este módulo no se toca.
- **Biometría**: se reutiliza `LivenessService.verify(username, sessionId, operationType, operationId)` con `operationType` `CREDIT_APPLICATION` o `INVESTMENT_APPLICATION` y el id de la solicitud, así cada verificación queda registrada en `biometric_verifications` atada a la operación. El navegador recibe credenciales STS de 15 minutos limitadas a `rekognition:StartFaceLivenessSession`, igual que en el registro. Máximo 5 intentos por solicitud; la sesión de liveness es de un solo uso y debe ser la emitida para esa solicitud.
- **Requisitos del cliente**: perfil de cliente (registro), correo verificado y rostro registrado (`customer_biometrics`). Las cuentas de ejemplo del perfil `dev` no tienen documento ni rostro: para probar el flujo completo registra una cuenta real en `/registro`.

La biometría es real (AWS Rekognition Face Liveness + búsqueda en la colección). No hay atajo ni simulación en ningún perfil.

## API

Cliente (`/api/client`, sesión + CSRF):

| Método y ruta | Permiso |
| --- | --- |
| `GET /readiness` | autenticado |
| `GET, POST /simulations`, `DELETE /simulations/{id}` | `simulation.save` |
| `GET /applications`, `GET /applications/{id}` | `own.requests.read` |
| `POST /applications` | `credit.request.create` o `investment.request.create` según el tipo |
| `POST /applications/{id}/biometric/start`, `/biometric/complete` | `identity.verification.start` |
| `POST /applications/{id}/cancel`, `/respond` | `own.requests.read` |
| `POST, GET, DELETE /applications/{id}/documents[/{documentId}]` | `own.requests.read` |

Revisión (`/api/admin/applications`): asesores y analistas de crédito ven créditos, el asesor de inversiones ve inversiones y el administrador ve ambos en modo consulta. Los borradores nunca aparecen en la bandeja.

| Método y ruta | Uso |
| --- | --- |
| `GET /` | Bandeja |
| `GET /{id}` | Solicitud + expediente del cliente |
| `POST /{id}/take` | `SUBMITTED → IN_REVIEW` |
| `POST /{id}/decision` `{decision, comment}` | `OBSERVE`, `RECOMMEND_APPROVE`, `RECOMMEND_REJECT`, `APPROVE`, `REJECT`, `RETURN` según `actions` |
| `GET /{id}/documents/{documentId}`, `GET /{id}/identity/{front\|back}` | Documentos |

Documentos: PDF, JPG o PNG, hasta 5 MB y 6 por solicitud; se valida la firma binaria del archivo, no solo la extensión.

## Base de datos

Migraciones `V20__solicitudes_en_linea.sql`, `V22__analista_de_credito.sql` (rol, permisos, estado `PENDING_APPROVAL`) y `V23__comentarios_internos_solicitudes.sql`. La V20 crea los permisos `credit.request.create` y `simulation.save` para el rol cliente, y tablas `saved_simulations`, `applications`, `application_schedule`, `application_events`, `application_documents`. Las tasas se guardan en porcentaje (15.50 = 15,50 %) para ambos módulos.

## Frontend

| Ruta | Página |
| --- | --- |
| `/cliente` | Mi espacio: productos aprobados, solicitudes, simulaciones guardadas |
| `/cliente/solicitudes/nueva` | Retoma la simulación pendiente y pide ingreso, destino u origen de fondos y consentimiento |
| `/cliente/solicitudes/:id` | Seguimiento, documentos, firma biométrica, respuesta a observaciones, cronograma |
| `/admin/solicitudes` | Bandeja del asesor |
| `/admin/solicitudes/:id` | Expediente y decisión |

El escenario pendiente se guarda en `sessionStorage` (`brunexa.pending-scenario`, 24 h) para sobrevivir al login y al registro dentro de la misma pestaña. Los simuladores solo necesitan renderizar `<SimulationActions scenario={...} />` con los parámetros de su resultado.

## Pendiente

- Notificar por correo los cambios de estado (el remitente ya existe en `VerificationMailer`).
- No hay registro de pagos: "próxima cuota" y "saldo proyectado" salen del cronograma, no de pagos reales.

## Correo al cliente

`ApplicationNotifier` (mismo patrón que `VerificationMailer`: si no hay `JavaMailSender` configurado,
registra el mensaje en el log en vez de fallar) envía un correo en los cambios de estado que le tocan
al cliente:

| Evento | Cuándo |
| --- | --- |
| Solicitud recibida | Al enviarla (biometría `APPROVED` o `MANUAL_REVIEW`) |
| Falta información | El asesor observa la solicitud |
| Aprobada | Decisión final `APPROVE` (asesor dentro de su atribución, o analista) |
| Rechazada | Decisión final `REJECT` |

No se notifica por correo `PENDING_APPROVAL` ni `RETURN` (comunicación interna asesor↔analista) ni la
respuesta del cliente a una observación. `ApplicationNotifierTests` cubre el camino sin `JavaMailSender`
configurado; el envío real no tiene test automatizado (dependería de una red/SMTP).

**Advertencia:** `backend/.env` trae credenciales SMTP reales (Gmail). Cualquier `OBSERVE`/`APPROVE`/
`REJECT` contra un backend levantado con ese `.env` intenta un envío real. En pruebas manuales usa
direcciones que no reboten, o quita temporalmente `spring.mail.*` del `.env` para que caiga al log.

## Pagos reales

`application_payments` (migración V25) registra qué cuota del cronograma se cobró de verdad. Se
registran siempre en orden: `POST /api/admin/applications/{id}/payments` no recibe el número de cuota,
el servidor calcula la siguiente (`max(installment_number) + 1`); solo se puede borrar el último pago
(`DELETE .../payments/{paymentId}`) para no dejar huecos. Requiere el permiso nuevo `payments.register`
(asesor de crédito, analista de crédito, asesor de inversiones, administrador — es registro contable,
no una decisión de crédito, así que no rompe la separación asesor/analista) y que la solicitud esté
`APPROVED`.

`Summary.nextDueDate/nextPayment/elapsedInstallments/projectedBalance` ya no se calculan comparando
`due_date` con la fecha de hoy: salen de `application_payments`. Esto es transparente para el frontend
(mismos campos); "Mis productos" en `/cliente` no cambió de código, solo de dato. `ApplicationDetail`
suma `paidThroughInstallment` y `payments`; `ScheduleTable` marca con un check las cuotas ya cobradas.

No recalcula la tabla ante abonos parciales o extraordinarios (eso quedó fuera de alcance): registrar
un pago solo confirma qué cuota del cronograma ya se cobró, con el monto que se quiera anotar.
