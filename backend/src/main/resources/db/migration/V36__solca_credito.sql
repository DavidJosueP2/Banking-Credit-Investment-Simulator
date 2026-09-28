-- Contribución SOLCA en créditos: 0,5 % del monto, por una sola vez.
--
-- Base legal: COMYF, Disposición General Décima Cuarta; Resolución JPRMF 003-2014-F;
-- SRI, Resolución NAC-DGERCGC20-00000019 y Formulario 118. La calculan las entidades del
-- sector financiero privado y las cooperativas SEPS como agentes de retención; las
-- instituciones del Estado no están sujetas. Se cobra sobre el monto de la operación
-- (o su remanente si es inferior a un año); si el plazo supera un año, por una única vez;
-- los sobregiros, al liquidarse; los consumos corrientes con tarjeta están exceptuados.
-- Brunexa solo simula créditos amortizables, así que la contribución se liquida una sola
-- vez en la primera cuota y se informa por separado del interés. No aplica a inversiones.

ALTER TABLE "${app-schema}".applications
    ADD COLUMN IF NOT EXISTS total_solca numeric(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE "${app-schema}".applications
    ADD CONSTRAINT applications_solca_check CHECK (total_solca >= 0);
