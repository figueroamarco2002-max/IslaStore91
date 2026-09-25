const pool = require('../config/db');

const Section = {
    findAll: async () => {
        const res = await pool.query('SELECT * FROM sections ORDER BY category, style, product_type');
        return res.rows;
    },
    findById: async (id) => {
        const res = await pool.query('SELECT * FROM sections WHERE id = $1', [id]);
        return res.rows[0];
    },
    findByCombination: async (category, style, product_type) => {
        const res = await pool.query(
            'SELECT * FROM sections WHERE category = $1 AND style = $2 AND product_type = $3',
            [category, style, product_type]
        );
        return res.rows[0];
    },
    create: async (category, style, product_type, visible = true) => {
        const res = await pool.query(
            `INSERT INTO sections (category, style, product_type, visible)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [category, style, product_type, visible]
        );
        return res.rows[0];
    },
    update: async (id, category, style, product_type, visible) => {
        const res = await pool.query(
            `UPDATE sections 
       SET category = $1, style = $2, product_type = $3, visible = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
            [category, style, product_type, visible, id]
        );
        return res.rows[0];
    },
    toggleVisible: async (id, visible) => {
        const res = await pool.query(
            'UPDATE sections SET visible = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [visible, id]
        );
        return res.rows[0];
    },
    delete: async (id) => {
        const res = await pool.query('DELETE FROM sections WHERE id = $1 RETURNING *', [id]);
        return res.rows[0];
    },

    // Cuenta secciones que usan un tipo/estilo dado (para impedir borrar
    // un tipo o estilo todavía referenciado por alguna sección del home).
    // ::int en SQL convierte el string que devuelve COUNT(*) a número,
    // por consistencia con Contact.js y Product.js.
    countByProductType: async (typeKey) => {
        const res = await pool.query(
            'SELECT COUNT(*)::int AS total FROM sections WHERE product_type ILIKE $1',
            [typeKey]
        );
        return res.rows[0].total;
    },
    countByStyle: async (styleKey) => {
        const res = await pool.query(
            'SELECT COUNT(*)::int AS total FROM sections WHERE style ILIKE $1',
            [styleKey]
        );
        return res.rows[0].total;
    },

    // Propaga el renombrado de una clave de tipo/estilo a las secciones
    // que la usaban, para que no queden huérfanas.
    renameProductType: async (oldKey, newKey) => {
        await pool.query('UPDATE sections SET product_type = $1 WHERE product_type ILIKE $2', [newKey, oldKey]);
    },
    renameStyle: async (oldKey, newKey) => {
        await pool.query('UPDATE sections SET style = $1 WHERE style ILIKE $2', [newKey, oldKey]);
    }
};

module.exports = Section;