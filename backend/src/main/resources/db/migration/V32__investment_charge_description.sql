-- Explicación para el cliente de qué cubre o a qué se destina cada costo adicional; en los opcionales es lo
-- que le permite decidir si lo agrega.
ALTER TABLE investment_product_charges
    ADD COLUMN description VARCHAR(300);
