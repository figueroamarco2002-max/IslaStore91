const pool = require('../config/db');

/**
 * Modelo para la configuración del banner "Próxima Vez".
 * Siempre existe una única fila (id = 1). Se usa UPSERT para
 * actualizar, de forma que nunca se necesita crear manualmente.
 */
const ProximaVezSettings = {
    /** Obtiene la configuración actual */
    get: async () => {
        const res = await pool.query(
            'SELECT * FROM proxima_vez_settings WHERE id = 1'
        );
        // Si todavía no existe la fila, devolvemos valores por defecto
        return res.rows[0] || {
            id: 1,
            title: 'Próxima Vez',
            subtitle: 'Esto es lo que viene...',
            banner_visible: true
        };
    },

    /**
     * Actualiza la configuración con UPSERT.
     * Solo los campos que se pasen en el objeto serán actualizados.
     */
    update: async ({ title, subtitle, banner_visible }) => {
        const res = await pool.query(
            `INSERT INTO proxima_vez_settings (id, title, subtitle, banner_visible, updated_at)
             VALUES (1, $1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE
               SET title          = EXCLUDED.title,
                   subtitle       = EXCLUDED.subtitle,
                   banner_visible = EXCLUDED.banner_visible,
                   updated_at     = NOW()
             RETURNING *`,
            [title, subtitle, banner_visible]
        );
        return res.rows[0];
    }
};

module.exports = ProximaVezSettings;
