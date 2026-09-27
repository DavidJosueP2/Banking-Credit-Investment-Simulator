-- Algunos productos iniciales guardaron el segmento como texto ("Consumo Prioritario").
-- Se normaliza al código del catálogo segmento_regulatorio para validar tasas y mostrar nombres.
UPDATE "${app-schema}".producto_credito
SET segmento_bce = CASE
    WHEN upper(segmento_bce) LIKE '%MINORISTA%' THEN 'MICROCREDITO_MINORISTA'
    WHEN upper(segmento_bce) LIKE '%AMPLIADA%' THEN 'MICROCREDITO_AMPLIADA'
    WHEN upper(segmento_bce) LIKE '%MICRO%' THEN 'MICROCREDITO_SIMPLE'
    WHEN upper(segmento_bce) LIKE '%VIP%' THEN 'VIVIENDA_VIP'
    WHEN upper(segmento_bce) LIKE '%VIS%' THEN 'VIVIENDA_VIS'
    WHEN upper(segmento_bce) LIKE '%INMOB%' OR upper(segmento_bce) LIKE '%VIVIENDA%' THEN 'INMOBILIARIO'
    WHEN upper(segmento_bce) LIKE '%CORP%' THEN 'PRODUCTIVO_CORPORATIVO'
    WHEN upper(segmento_bce) LIKE '%EMPRES%' THEN 'PRODUCTIVO_EMPRESARIAL'
    WHEN upper(segmento_bce) LIKE '%PYME%' OR upper(segmento_bce) LIKE '%PROD%' THEN 'PRODUCTIVO_PYMES'
    WHEN upper(segmento_bce) LIKE '%EDUC%' AND upper(segmento_bce) LIKE '%SOCIAL%' THEN 'EDUCATIVO_SOCIAL'
    WHEN upper(segmento_bce) LIKE '%EDUC%' THEN 'EDUCATIVO'
    WHEN upper(segmento_bce) LIKE '%ORDINARIO%' THEN 'CONSUMO_ORDINARIO'
    ELSE 'CONSUMO_PRIORITARIO'
END
WHERE segmento_bce IS NULL
   OR segmento_bce NOT IN (SELECT codigo FROM "${app-schema}".segmento_regulatorio);
