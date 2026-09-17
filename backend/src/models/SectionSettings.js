const pool = require('../config/db');

const SectionSettings = {
    findAll: async () => {
        const res = await pool.query('SELECT section_key, enabled FROM section_settings ORDER BY section_key');
        return res.rows;
    },
    updateOne: async (key, enabled) => {
        const res = await pool.query(
            'UPDATE section_settings SET enabled = $1 WHERE section_key = $2 RETURNING *',
            [enabled, key]
        );
        return res.rows[0];
    }
};

module.exports = SectionSettings;