const pool = require('../config/db');

const SectionSettings = {
    findAll: async () => {
        const res = await pool.query('SELECT section_key, enabled FROM section_settings ORDER BY section_key');
        return res.rows;
    },
    updateOne: async (key, enabled) => {
        // 1. Verificamos si la clave de la sección ya existe en la base de datos
        const check = await pool.query('SELECT * FROM section_settings WHERE section_key = $1', [key]);

        if (check.rows.length === 0) {
            // 2. Si NO existe (como los banners nuevos), la CREAMOS para que se guarde el estado
            const res = await pool.query(
                'INSERT INTO section_settings (section_key, enabled) VALUES ($1, $2) RETURNING *',
                [key, enabled]
            );
            return res.rows[0];
        } else {
            // 3. Si YA existe, simplemente actualizamos su estado
            const res = await pool.query(
                'UPDATE section_settings SET enabled = $1 WHERE section_key = $2 RETURNING *',
                [enabled, key]
            );
            return res.rows[0];
        }
    }
};

module.exports = SectionSettings;