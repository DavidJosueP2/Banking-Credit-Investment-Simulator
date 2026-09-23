-- Datos semilla: Fuentes de tasas y Segmentos/Tipos de crédito
-- Contexto Ecuador — estructura jerárquica SEGMENTO → TIPO → PRODUCTO

-- ─────────────────────────────────────────────────────────────
-- Fuentes de tasas
-- ─────────────────────────────────────────────────────────────
INSERT INTO "${app-schema}".fuente_tasa (codigo, nombre, descripcion, url) VALUES
('BCE',           'Banco Central del Ecuador',              'Tasas activas efectivas referenciales y máximas oficiales del BCE', 'https://contenido.bce.fin.ec/documentos/Estadisticas/SectorMonFin/TasasInteres/Indice.htm'),
('SEPS',          'Superintendencia de Economía Popular y Solidaria', 'Tasas activas y pasivas del Sector Financiero Popular y Solidario', 'https://estadisticas.seps.gob.ec/'),
('BIESS',         'Banco del Instituto Ecuatoriano de Seguridad Social', 'Tasas hipotecarias, quirografarias y prendarias del BIESS', 'https://www.biess.fin.ec/'),
('INSTITUCIONAL', 'Tasa Institucional',                    'Tasa ofertada por la propia institución financiera', NULL),
('ADMIN',         'Configurada por Administrador',         'Tasa ingresada manualmente por el administrador del sistema', NULL),
('ACADEMICA',     'Tasa Académica / Demostración',         'Tasa de referencia para presentaciones académicas y demostraciones', NULL);

-- ─────────────────────────────────────────────────────────────
-- Segmentos de crédito (según requerimiento)
-- ─────────────────────────────────────────────────────────────
INSERT INTO "${app-schema}".segmento_credito (codigo, nombre, descripcion, orden) VALUES
('CONSUMO',       'Consumo',        'Créditos destinados a la adquisición de bienes y servicios de consumo personal', 1),
('EDUCACION',     'Educación',      'Créditos para financiar estudios en todos los niveles educativos', 2),
('VIVIENDA',      'Vivienda',       'Créditos para adquisición, construcción, mejora o ampliación de bienes inmuebles', 3),
('PRODUCTIVO',    'Productivos',    'Créditos destinados a actividades productivas empresariales y corporativas', 4),
('MICROCREDITO',  'Microcrédito',   'Créditos para microempresarios con actividades productivas o de servicios', 5),
('AGROPECUARIO',  'Agropecuario',   'Créditos para el sector agrícola, ganadero, pesquero y acuícola', 6),
('GARANTIAS',     'Garantías',      'Clasificación por tipo de garantía del crédito', 7),
('OTROS',         'Otros',          'Líneas de crédito especiales y productos financieros alternativos', 8);

-- ─────────────────────────────────────────────────────────────
-- Tipos de crédito por segmento
-- ─────────────────────────────────────────────────────────────

-- CONSUMO
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Crédito de consumo',                  'Crédito general para consumo personal', 1),
    ('Crédito personal',                    'Crédito de libre disponibilidad para personas naturales', 2),
    ('Crédito automotriz',                  'Financiamiento para adquisición de vehículos', 3),
    ('Crédito para motocicleta',            'Financiamiento para adquisición de motocicletas', 4),
    ('Crédito para viajes',                 'Crédito para financiar viajes nacionales o internacionales', 5),
    ('Crédito para salud',                  'Crédito para gastos médicos y de salud', 6),
    ('Crédito para electrodomésticos',      'Financiamiento de electrodomésticos y equipos del hogar', 7),
    ('Crédito para enseres',                'Financiamiento de muebles y enseres del hogar', 8),
    ('Crédito para consolidación de deudas','Unificación de deudas en un solo crédito', 9),
    ('Crédito para pago de tarjetas',       'Crédito para cancelar saldos de tarjetas de crédito', 10),
    ('Crédito de emergencia',               'Crédito inmediato para situaciones de emergencia', 11)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'CONSUMO';

-- EDUCACION
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Crédito educativo',              'Crédito general para gastos educativos', 1),
    ('Crédito educativo social',       'Crédito educativo con condiciones preferenciales para sectores vulnerables', 2),
    ('Crédito universitario',          'Financiamiento de estudios universitarios de pregrado', 3),
    ('Crédito para posgrado',          'Financiamiento de estudios de posgrado, maestría o doctorado', 4),
    ('Crédito para matrícula',         'Crédito específico para cubrir costos de matrícula', 5),
    ('Crédito para pensiones',         'Crédito para el pago de pensiones mensuales', 6)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'EDUCACION';

-- VIVIENDA
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Crédito hipotecario',            'Crédito con garantía hipotecaria para adquisición de inmuebles', 1),
    ('Crédito de vivienda',            'Crédito general para vivienda', 2),
    ('Vivienda de interés social (VIS)','Vivienda para segmentos de menores ingresos', 3),
    ('Vivienda de interés público (VIP)','Vivienda de interés público con condiciones especiales', 4),
    ('Vivienda terminada',             'Adquisición de vivienda ya construida', 5),
    ('Vivienda nueva',                 'Adquisición de vivienda nueva de proyecto', 6),
    ('Vivienda usada',                 'Adquisición de vivienda de segunda mano', 7),
    ('Construcción',                   'Financiamiento para construcción de vivienda propia', 8),
    ('Remodelación',                   'Crédito para remodelar o renovar una vivienda', 9),
    ('Ampliación',                     'Crédito para ampliar una vivienda existente', 10),
    ('Compra de terreno',              'Financiamiento para adquisición de terreno', 11),
    ('Terreno + construcción',         'Financiamiento combinado para terreno y construcción', 12),
    ('Sustitución de hipoteca',        'Refinanciamiento de una hipoteca existente', 13),
    ('Vivienda multifamiliar',         'Financiamiento para edificios o complejos residenciales', 14),
    ('Local comercial',                'Adquisición de local comercial', 15),
    ('Oficina',                        'Adquisición de espacio de oficinas', 16),
    ('Consultorio',                    'Adquisición de consultorio profesional', 17),
    ('Otros bienes inmuebles',         'Otros tipos de bienes inmuebles', 18)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'VIVIENDA';

-- PRODUCTIVO
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Productivo Corporativo',         'Para empresas grandes con ventas anuales superiores a USD 5 millones', 1),
    ('Productivo Empresarial',         'Para empresas medianas con ventas entre USD 1 y 5 millones', 2),
    ('Productivo PYMES',               'Para pequeñas y medianas empresas', 3),
    ('Crédito comercial',              'Financiamiento para actividades comerciales', 4),
    ('Capital de trabajo',             'Crédito para cubrir necesidades operativas del negocio', 5),
    ('Crédito de inversión',           'Para adquisición de activos fijos productivos', 6),
    ('Crédito para maquinaria',        'Financiamiento de maquinaria industrial', 7),
    ('Crédito para equipos',           'Financiamiento de equipos y herramientas', 8),
    ('Crédito para expansión',         'Financiamiento para crecimiento o expansión del negocio', 9),
    ('Crédito para emprendimiento',    'Crédito para nuevos emprendimientos', 10)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'PRODUCTIVO';

-- MICROCREDITO
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Microcrédito Minorista',                 'Para microempresarios con ventas anuales hasta USD 100.000', 1),
    ('Microcrédito de Acumulación Simple',     'Para microempresarios con ventas hasta USD 100.000 con activos limitados', 2),
    ('Microcrédito de Acumulación Ampliada',   'Para microempresarios con ventas hasta USD 100.000 con mayor capacidad', 3),
    ('Microcrédito comercial',                 'Para actividades de comercio menor', 4),
    ('Microcrédito agrícola',                  'Para pequeños productores agrícolas', 5),
    ('Microcrédito ganadero',                  'Para pequeños ganaderos y criadores', 6),
    ('Microcrédito productivo',                'Para producción artesanal y manufactura menor', 7),
    ('Microcrédito de servicios',              'Para prestadores de servicios de pequeña escala', 8)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'MICROCREDITO';

-- AGROPECUARIO
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Agrícola',             'Crédito para producción agrícola', 1),
    ('Ganadero',             'Crédito para actividad ganadera', 2),
    ('Pesquero',             'Crédito para actividades pesqueras', 3),
    ('Acuícola',             'Crédito para acuicultura y camaroneras', 4),
    ('Maquinaria agrícola',  'Financiamiento de maquinaria para el agro', 5),
    ('Riego',                'Crédito para sistemas de riego', 6),
    ('Insumos',              'Crédito para adquisición de insumos agrícolas', 7),
    ('Cultivos',             'Crédito para financiar ciclos de cultivo', 8),
    ('Compra de ganado',     'Financiamiento para adquisición de ganado', 9)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'AGROPECUARIO';

-- GARANTIAS
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Quirografario',        'Crédito respaldado únicamente por la firma del deudor', 1),
    ('Hipotecario',          'Crédito respaldado con garantía hipotecaria sobre bien inmueble', 2),
    ('Prendario',            'Crédito respaldado con prenda sobre bien mueble', 3),
    ('Garantía personal',    'Crédito con garantía personal de tercero', 4),
    ('Garante',              'Crédito con figura de garante solidario', 5),
    ('Garantía líquida',     'Crédito respaldado con depósito en efectivo o inversión', 6),
    ('Sin garantía específica','Crédito sin garantía formal requerida', 7)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'GARANTIAS';

-- OTROS
INSERT INTO "${app-schema}".tipo_credito (segmento_id, nombre, descripcion, orden)
SELECT s.id, t.nombre, t.descripcion, t.orden
FROM "${app-schema}".segmento_credito s,
(VALUES
    ('Línea de crédito',             'Cupo aprobado de crédito de uso rotativo', 1),
    ('Crédito rotativo',             'Crédito que se renueva automáticamente al pago', 2),
    ('Sobregiro',                    'Cobertura de sobregiro en cuenta corriente', 3),
    ('Crédito inmediato',            'Desembolso inmediato sin trámites extensos', 4),
    ('Factoring',                    'Descuento de facturas y cuentas por cobrar', 5),
    ('Leasing financiero',           'Arrendamiento con opción de compra', 6),
    ('Comercio exterior',            'Crédito para operaciones de comercio internacional', 7),
    ('Importación',                  'Financiamiento para importación de bienes', 8),
    ('Exportación',                  'Financiamiento para exportación de bienes', 9),
    ('Financiamiento de proveedores','Crédito para financiar cadena de suministro', 10)
) AS t(nombre, descripcion, orden)
WHERE s.codigo = 'OTROS';
