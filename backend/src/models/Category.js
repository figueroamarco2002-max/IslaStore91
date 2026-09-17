// src/models/Category.js
const pool = require('../config/db');

const Category = {
  findAll: async () => {
    const res = await pool.query('SELECT * FROM categories ORDER BY name');
    return res.rows;
  },

  findById: async (id) => {
    const res = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    return res.rows[0];
  },

  findByName: async (name) => {
    const res = await pool.query('SELECT * FROM categories WHERE name = $1', [name]);
    return res.rows[0];
  },

  findBySlug: async (slug) => {
    const res = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
    return res.rows[0];
  },

  create: async (name, slug) => {
    const res = await pool.query(
      'INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *',
      [name, slug]
    );
    return res.rows[0];
  },

  update: async (id, name, slug) => {
    const res = await pool.query(
      'UPDATE categories SET name = $1, slug = $2 WHERE id = $3 RETURNING *',
      [name, slug, id]
    );
    return res.rows[0];
  },

  delete: async (id) => {
    const res = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },
};

module.exports = Category;