# Normativa de créditos: qué es regulación y qué es política

Todos los límites viven en la tabla `regla_normativa` (con vigencia, organismo y fuente) y el configurador del asesor los recibe desde `GET /api/admin/creditos/configurar/marco`. El frontend no tiene topes escritos.

## Tasas máximas (regulación del BCE)

Tasas activas efectivas publicadas por el Banco Central del Ecuador para **septiembre de 2026** (metodología de la JPRF, Resolución JPRF-F-2023-070). Fuente: [BCE – Tasas de interés vigentes](https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm).

| Segmento | Referencial | Máxima |
| --- | ---: | ---: |
| Productivo corporativo | 7,03 % | 7,72 % |
| Productivo empresarial | 9,05 % | 9,99 % |
| Productivo PYMES | 8,98 % | 10,15 % |
| Consumo | 15,74 % | 16,77 % |
| Educativo | 8,83 % | 9,50 % |
| Educativo social | 5,49 % | 7,50 % |
| Vivienda de interés público | 4,99 % | 4,99 % |
| Vivienda de interés social | 4,99 % | 4,99 % |
| Inmobiliario | 8,55 % | 9,26 % |
| Microcrédito minorista | 19,65 % | 28,23 % |
| Microcrédito de acumulación simple | 20,74 % | 24,89 % |
| Microcrédito de acumulación ampliada | 18,53 % | 22,05 % |

- **Son iguales para bancos y cooperativas**: la norma aplica a todo el sistema financiero nacional (sector privado, público y popular y solidario). Por eso el tipo de entidad no cambia la tasa máxima.
- Antes el código tenía valores anteriores (productivo corporativo 9,33 %, empresarial 10,21 %, PYMES 11,83 %, inmobiliario 10,40 %, acumulación simple y ampliada 25,50 %) y un segmento "Consumo ordinario" (17,30 %) que desapareció en la segmentación de 2020. Se corrigieron en `V21`.
- Un producto cuya tasa supera la máxima vigente **deja de ofrecerse** en el simulador y el configurador lo marca en rojo. Cuando el BCE publique nuevas tasas, se inserta una regla con la nueva fecha de inicio y se cierra la anterior; no hay que tocar código.
- La tasa referencial se usa como valor sugerido al crear un producto.
- `NormativaSeedTests` verifica que la migración siembre exactamente estos valores.

## Límites de política institucional (no son del BCE)

- **Monto y plazo máximo por segmento**: desde la Resolución 603-2020-F los subsegmentos (p. ej. microcrédito minorista) se definen por las ventas del cliente, no por el monto del préstamo. El BCE no fija montos máximos por segmento; los existentes se etiquetan como `INSTITUCIONAL`.
- **Seguro de desgravamen**: la prima la fija la aseguradora (supervisada por la Superintendencia de Compañías) según edad y riesgo. Se aplica un rango prudencial según el tipo de entidad: banco 0,0100 %–0,0650 % mensual, cooperativa 0,0400 %–0,1200 % mensual.
- **Cobros indirectos**: hasta 5 por producto; porcentaje mensual ≤ 0,50 %, fijo mensual ≤ 50 USD, cobro único ≤ 3 % del monto o ≤ 500 USD. Las donaciones nunca pueden ser obligatorias. El desgravamen no se puede duplicar como cobro indirecto.

## Contribución SOLCA (regulación, solo crédito)

- **0,5 % del monto de la operación, por una sola vez**: base legal COMYF, Disposición General Décima Cuarta; Resolución JPRMF 003-2014-F; SRI, Resolución NAC-DGERCGC20-00000019 y Formulario 118. Financia la atención integral del cáncer (50 % Estado, 50 % núcleos SOLCA vía BCE).
- **Alcance**: operaciones de crédito (financiamiento, compra de cartera, descuentos, reporto, vencidos/refinanciados/reestructurados), consumos diferidos con tarjeta y sobregiros. Excepciones: consumos corrientes con tarjeta; instituciones del Estado no sujetas; sobregiros al liquidarse; si el plazo supera un año, por una única vez. Brunexa solo simula créditos amortizables: se liquida una sola vez en la primera cuota.
- **Implementación**: `SimuladorService.calcularSolca` = `monto × 0,005` (HALF_UP, 2 decimales). Se suma a los cargos de la cuota 1, entra al total a pagar y a la cuota máxima de capacidad de pago, y se expone como `totalSolca` en simulación, solicitud (`applications.total_solca`, migración `V36`) y reportes. No es interés ni seguro y **no aplica a inversiones**.
- Pruebas: `CreditoBoundaryAndEntityTest.solcaUnicaEnPrimeraCuota` (francés y alemán, cuota 1, cuadre de totales).

## Tipo de entidad

Se define una vez en Configuración → Institución (`institution.entityType`: Banco o Cooperativa). Todos los productos lo heredan; el asesor ya no lo elige por producto.

## Cálculo de la tabla

- Todos los cobros indirectos (seguros adicionales, gastos, donaciones elegidas) se suman en **una sola columna**; el desgravamen tiene la suya. La contribución SOLCA viaja dentro de esa columna en la cuota 1, pero se informa por separado como `totalSolca`.
- Los obligatorios siempre se cobran; los opcionales solo si el cliente los marca en el simulador (viajan en `cargosOpcionales` y se guardan con la simulación y la solicitud).
- En productos con cuota anual, un cobro mensual se multiplica por 12 en cada cuota.
- Pruebas: `CreditoBoundaryAndEntityTest` (tasas máximas por segmento, banco y cooperativa, desgravamen, cobros estrictos, dos seguros + gasto en una columna, cobro opcional, cuota anual).

## Herramientas del simulador

- **¿Cuánto me prestan?** (`POST /api/simulador/capacidad`, `CapacidadPagoService`): busca el mayor monto cuya cuota más alta no supera la cuota disponible, probando montos con el mismo simulador (incluye desgravamen, cobros y SOLCA en la primera cuota). Si la cuota no alcanza el monto mínimo del producto lo dice; si alcanza para más que el máximo, devuelve el máximo.
- **Meta de ahorro** (`POST /api/public/investments/goals`, `InvestmentGoalService`): busca, al centavo, el menor capital que llega al valor objetivo en el plazo y forma de pago elegidos, con el simulador de inversiones (tasas por tramo y retenciones incluidas).
- **Costo del crédito**: el resultado muestra en grande la tasa efectiva anual, el costo total y la carga financiera (total menos lo recibido), además de la composición del total y capital e interés por cuota.
- Pruebas: `CapacidadYMetaTests`.
