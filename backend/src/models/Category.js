const pool = require('../config/db');

const Category = {
  findAll: async () => {
    const res = await pool.query('SELECT * FROM categories ORDER BY name');
    return res.rows;
  },
  findByName: async (name) => {
    const res = await pool.query('SELECT * FROM categories WHERE name = $1', [name]);
    return res.rows[0];
  },
  create: async (name, slug) => {
    const res = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    return res.rows[0];
  }
};

module.exports = Category;