-- La recomendación del asesor y las devoluciones del analista son comunicación interna:
-- el cliente ve el cambio de estado, pero no el comentario.
ALTER TABLE "${app-schema}".application_events ADD COLUMN internal boolean NOT NULL DEFAULT false;
