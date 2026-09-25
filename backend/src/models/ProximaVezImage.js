const pool = require('../config/db');

/**
 * Modelo para las imágenes del carrusel "Próxima Vez".
 * Las imágenes se almacenan en Supabase Storage; aquí solo
 * guardamos la URL pública y metadatos de estado/orden.
 */
const ProximaVezImage = {
    /** Obtiene todas las imágenes activas, ordenadas por sort_order */
    findAllActive: async () => {
        const res = await pool.query(
            'SELECT * FROM proxima_vez_images WHERE is_active = true ORDER BY sort_order ASC, created_at ASC'
        );
        return res.rows;
    },

    /** Obtiene todas las imágenes (activas e inactivas) para el admin */
    findAll: async () => {
        const res = await pool.query(
            'SELECT * FROM proxima_vez_images ORDER BY sort_order ASC, created_at ASC'
        );
        return res.rows;
    },

    findById: async (id) => {
        const res = await pool.query(
            'SELECT * FROM proxima_vez_images WHERE id = $1', [id]
        );
        return res.rows[0];
    },

    /** Crea una nueva imagen con la URL pública de Supabase */
    create: async (imageUrl, sortOrder = 0) => {
        const res = await pool.query(
            `INSERT INTO proxima_vez_images (image_url, sort_order, is_active)
             VALUES ($1, $2, true) RETURNING *`,
            [imageUrl, sortOrder]
        );
        return res.rows[0];
    },

    /** Activa o desactiva una imagen sin eliminarla */
    toggleActive: async (id, isActive) => {
        const res = await pool.query(
            'UPDATE proxima_vez_images SET is_active = $1 WHERE id = $2 RETURNING *',
            [isActive, id]
        );
        return res.rows[0];
    },

    delete: async (id) => {
        const res = await pool.query(
            'DELETE FROM proxima_vez_images WHERE id = $1 RETURNING *', [id]
        );
        return res.rows[0];
    },

    /** Cuenta cuántas imágenes hay (para validar el límite de 10).
     *  ::int en SQL convierte el string que devuelve COUNT(*) a número,
     *  por consistencia con Contact.js, Product.js y Section.js. */
    count: async () => {
        const res = await pool.query('SELECT COUNT(*)::int AS total FROM proxima_vez_images');
        return res.rows[0].total;
    }
};

module.exports = ProximaVezImage;