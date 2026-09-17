const pool = require('../config/db');

const ProductStyle = {
    findAll: async () => {
        const res = await pool.query('SELECT * FROM product_styles ORDER BY sort_order, label');
        return res.rows;
    },
    findById: async (id) => {
        const res = await pool.query('SELECT * FROM product_styles WHERE id = $1', [id]);
        return res.rows[0];
    },
    findByKey: async (key) => {
        const res = await pool.query('SELECT * FROM product_styles WHERE key = $1', [key]);
        return res.rows[0];
    },
    create: async (key, label, sortOrder) => {
        const res = await pool.query(
            'INSERT INTO product_styles (key, label, sort_order) VALUES ($1, $2, $3) RETURNING *',
            [key, label, sortOrder]
        );
        return res.rows[0];
    },
    update: async (id, key, label, sortOrder) => {
        const res = await pool.query(
            'UPDATE product_styles SET key = $1, label = $2, sort_order = $3 WHERE id = $4 RETURNING *',
            [key, label, sortOrder, id]
        );
        return res.rows[0];
    },
    delete: async (id) => {
        const res = await pool.query('DELETE FROM product_styles WHERE id = $1 RETURNING *', [id]);
        return res.rows[0];
    }
};

module.exports = ProductStyle;