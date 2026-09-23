const pool = require('../config/db');

// Columnas que se exponen al admin. Si mañana se agrega una columna
// interna a `contactos` (ej. notas privadas, ip_origen), NO se filtra
// al frontend a menos que se agregue acá explícitamente.
const PUBLIC_COLUMNS = 'id, nombre, correo, telefono, comentario, leido, created_at';

const Contact = {
    create: async (data) => {
        const { nombre, correo, telefono, comentario } = data;
        const res = await pool.query(
            `INSERT INTO contactos (nombre, correo, telefono, comentario)
             VALUES ($1, $2, $3, $4)
             RETURNING ${PUBLIC_COLUMNS}`,
            [nombre, correo, telefono || null, comentario]
        );
        return res.rows[0];
    },

    findAll: async ({ limit = 20, offset = 0 } = {}) => {
        const res = await pool.query(
            `SELECT ${PUBLIC_COLUMNS} FROM contactos
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return res.rows;
    },

    count: async () => {
        const res = await pool.query(`SELECT COUNT(*)::int AS total FROM contactos`);
        return res.rows[0].total;
    },

    markAsRead: async (id) => {
        const res = await pool.query(
            `UPDATE contactos SET leido = true WHERE id = $1
             RETURNING ${PUBLIC_COLUMNS}`,
            [id]
        );
        return res.rows[0];
    },

    delete: async (id) => {
        const res = await pool.query(
            `DELETE FROM contactos WHERE id = $1
             RETURNING ${PUBLIC_COLUMNS}`,
            [id]
        );
        return res.rows[0];
    }
};

module.exports = Contact;