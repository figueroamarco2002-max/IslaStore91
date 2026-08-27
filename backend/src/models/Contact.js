const pool = require('../config/db');

const Contact = {
    create: async (data) => {
        const { nombre, correo, telefono, comentario } = data;
        const res = await pool.query(
            `INSERT INTO contactos (nombre, correo, telefono, comentario)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, correo, telefono || null, comentario]
        );
        return res.rows[0];
    },

    findAll: async () => {
        const res = await pool.query(
            `SELECT * FROM contactos ORDER BY created_at DESC`
        );
        return res.rows;
    },

    markAsRead: async (id) => {
        const res = await pool.query(
            `UPDATE contactos SET leido = true WHERE id = $1 RETURNING *`,
            [id]
        );
        return res.rows[0];
    },

    delete: async (id) => {
        const res = await pool.query(
            `DELETE FROM contactos WHERE id = $1 RETURNING *`,
            [id]
        );
        return res.rows[0];
    }
};

module.exports = Contact;