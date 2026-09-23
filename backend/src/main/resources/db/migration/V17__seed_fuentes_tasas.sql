-- Tasas de referencia del BCE — Ecuador
-- Fuente: https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm
-- Vigencia: Septiembre 2024 (actualizar con valores del mes en curso)
-- IMPORTANTE: Estas son tasas de referencia. El administrador puede actualizarlas.

-- Tasas activas efectivas referenciales y máximas por segmento BCE
INSERT INTO "${app-schema}".tasa_credito
    (fuente_id, tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, url_fuente)
SELECT f.id, t.tipo_tasa, t.nombre, t.valor, t.fecha_vigencia::DATE, t.segmento_bce, t.observacion, t.url_fuente
FROM "${app-schema}".fuente_tasa f,
(VALUES
    -- Consumo
    ('REFERENTIAL', 'Consumo — Tasa Referencial',               17.3200, '2024-09-01', 'Consumo',                    'Tasa activa efectiva referencial segmento Consumo — BCE Sept 2024',         'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Consumo — Tasa Máxima',                    17.3000, '2024-09-01', 'Consumo',                    'Tasa activa efectiva máxima segmento Consumo — BCE Sept 2024',               'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Consumo Ordinario
    ('REFERENTIAL', 'Consumo Ordinario — Tasa Referencial',     17.3000, '2024-09-01', 'Consumo Ordinario',          'Tasa activa efectiva referencial segmento Consumo Ordinario — BCE Sept 2024','https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Consumo Ordinario — Tasa Máxima',          17.3000, '2024-09-01', 'Consumo Ordinario',          'Tasa activa efectiva máxima segmento Consumo Ordinario — BCE Sept 2024',    'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Consumo Prioritario
    ('REFERENTIAL', 'Consumo Prioritario — Tasa Referencial',   16.7700, '2024-09-01', 'Consumo Prioritario',        'Tasa activa efectiva referencial segmento Consumo Prioritario — BCE Sept 2024','https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Consumo Prioritario — Tasa Máxima',        16.7700, '2024-09-01', 'Consumo Prioritario',        'Tasa activa efectiva máxima segmento Consumo Prioritario — BCE Sept 2024',  'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Educativo
    ('REFERENTIAL', 'Educativo — Tasa Referencial',              9.5000, '2024-09-01', 'Educativo',                  'Tasa activa efectiva referencial segmento Educativo — BCE Sept 2024',       'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Educativo — Tasa Máxima',                   9.5000, '2024-09-01', 'Educativo',                  'Tasa activa efectiva máxima segmento Educativo — BCE Sept 2024',             'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Vivienda de Interés Público
    ('REFERENTIAL', 'Vivienda Interés Público — Referencial',    4.9900, '2024-09-01', 'Inmobiliario de Interés Público', 'Tasa activa efectiva referencial VIP — BCE Sept 2024',               'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Vivienda Interés Público — Máxima',         4.9900, '2024-09-01', 'Inmobiliario de Interés Público', 'Tasa activa efectiva máxima VIP — BCE Sept 2024',                   'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Vivienda de Interés Social
    ('REFERENTIAL', 'Vivienda Interés Social — Referencial',     4.9900, '2024-09-01', 'Inmobiliario de Interés Social', 'Tasa activa efectiva referencial VIS — BCE Sept 2024',                'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Vivienda Interés Social — Máxima',          4.9900, '2024-09-01', 'Inmobiliario de Interés Social', 'Tasa activa efectiva máxima VIS — BCE Sept 2024',                    'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Inmobiliario (vivienda general)
    ('REFERENTIAL', 'Inmobiliario — Tasa Referencial',          11.3300, '2024-09-01', 'Inmobiliario',               'Tasa activa efectiva referencial segmento Inmobiliario — BCE Sept 2024',    'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Inmobiliario — Tasa Máxima',               11.3300, '2024-09-01', 'Inmobiliario',               'Tasa activa efectiva máxima segmento Inmobiliario — BCE Sept 2024',         'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Productivo Corporativo
    ('REFERENTIAL', 'Productivo Corporativo — Referencial',      8.1900, '2024-09-01', 'Productivo Corporativo',     'Tasa activa efectiva referencial Productivo Corporativo — BCE Sept 2024',   'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Productivo Corporativo — Máxima',           9.3300, '2024-09-01', 'Productivo Corporativo',     'Tasa activa efectiva máxima Productivo Corporativo — BCE Sept 2024',        'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Productivo Empresarial
    ('REFERENTIAL', 'Productivo Empresarial — Referencial',     10.2100, '2024-09-01', 'Productivo Empresarial',     'Tasa activa efectiva referencial Productivo Empresarial — BCE Sept 2024',   'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Productivo Empresarial — Máxima',          10.2100, '2024-09-01', 'Productivo Empresarial',     'Tasa activa efectiva máxima Productivo Empresarial — BCE Sept 2024',        'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Productivo PYMES
    ('REFERENTIAL', 'Productivo PYMES — Referencial',           11.8300, '2024-09-01', 'Productivo PYMES',           'Tasa activa efectiva referencial Productivo PYMES — BCE Sept 2024',         'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Productivo PYMES — Máxima',                11.8300, '2024-09-01', 'Productivo PYMES',           'Tasa activa efectiva máxima Productivo PYMES — BCE Sept 2024',              'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Microcrédito Minorista
    ('REFERENTIAL', 'Microcrédito Minorista — Referencial',     28.5000, '2024-09-01', 'Microcrédito Minorista',     'Tasa activa efectiva referencial Microcrédito Minorista — BCE Sept 2024',  'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Microcrédito Minorista — Máxima',          30.5000, '2024-09-01', 'Microcrédito Minorista',     'Tasa activa efectiva máxima Microcrédito Minorista — BCE Sept 2024',       'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Microcrédito Acumulación Simple
    ('REFERENTIAL', 'Microcrédito Acumulación Simple — Ref.',   25.5000, '2024-09-01', 'Microcrédito de Acumulación Simple', 'Tasa referencial Microcrédito Acumulación Simple — BCE Sept 2024', 'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Microcrédito Acumulación Simple — Máx.',   27.5000, '2024-09-01', 'Microcrédito de Acumulación Simple', 'Tasa máxima Microcrédito Acumulación Simple — BCE Sept 2024',     'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Microcrédito Acumulación Ampliada
    ('REFERENTIAL', 'Microcrédito Acumulación Ampliada — Ref.',  22.5000, '2024-09-01', 'Microcrédito de Acumulación Ampliada', 'Tasa referencial Microcrédito Acumulación Ampliada — BCE Sept 2024', 'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    ('MAXIMUM',     'Microcrédito Acumulación Ampliada — Máx.',  25.5000, '2024-09-01', 'Microcrédito de Acumulación Ampliada', 'Tasa máxima Microcrédito Acumulación Ampliada — BCE Sept 2024',  'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
    -- Tasa académica de demostración
    ('ACADEMIC',    'Tasa demostración — Consumo',               15.7400, '2024-09-01', 'Consumo Prioritario',        'Tasa de referencia académica — Consumo Prioritario (usada en presentaciones)', NULL),
    ('ACADEMIC',    'Tasa demostración — máxima Consumo',        16.7700, '2024-09-01', 'Consumo Prioritario',        'Tasa máxima de referencia académica — Consumo Prioritario (usada en presentaciones)', NULL)
) AS t(tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, url_fuente)
WHERE f.codigo = 'BCE'

UNION ALL

SELECT f.id, t.tipo_tasa, t.nombre, t.valor, t.fecha_vigencia::DATE, t.segmento_bce, t.observacion, t.url_fuente
FROM "${app-schema}".fuente_tasa f,
(VALUES
    ('ACADEMIC', 'Tasa demostración — Consumo (admin)',    15.7400, '2024-09-01', 'Consumo Prioritario', 'Tasa configurada para demostración académica — puede cambiarse libremente', NULL),
    ('ACADEMIC', 'Tasa demostración — máxima (admin)',     16.7700, '2024-09-01', 'Consumo Prioritario', 'Tasa máxima configurada para demostración académica', NULL)
) AS t(tipo_tasa, nombre, valor, fecha_vigencia, segmento_bce, observacion, url_fuente)
WHERE f.codigo = 'ADMIN';
