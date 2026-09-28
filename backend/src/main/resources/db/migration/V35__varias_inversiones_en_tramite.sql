-- Cada inversión es un contrato aparte: un cliente puede tener varias en trámite del mismo plan (el
-- servicio aplica un tope). Para créditos se mantiene una en trámite por tipo de crédito, porque cada
-- solicitud se evalúa contra la capacidad de pago del cliente.
-- El detalle libre del destino u origen de fondos pasa a ser opcional (salvo con "Otro", que valida
-- el servicio): la categoría estructurada de V34 es ahora el dato principal.

DROP INDEX "${app-schema}".applications_one_open_per_product;
CREATE UNIQUE INDEX applications_one_open_per_product ON "${app-schema}".applications(user_id, product_type, product_id)
    WHERE product_type = 'CREDIT' AND status IN ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'OBSERVED', 'PENDING_APPROVAL');

ALTER TABLE "${app-schema}".applications ALTER COLUMN purpose DROP NOT NULL;
