const pool = require('./src/config/db');

async function agregarColumnaSku() {
    try {
        await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE;`);
        console.log('✅ Columna "sku" agregada correctamente a la tabla products');
    } catch (error) {
        console.error('❌ Error al agregar la columna:', error);
    } finally {
        await pool.end();
    }
}

agregarColumnaSku();