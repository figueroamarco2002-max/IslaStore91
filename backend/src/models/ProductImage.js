const pool = require('../config/db');

const ProductImage = {
  create: async (product_id, image_url, is_primary = false) => {
    const res = await pool.query(
      `INSERT INTO product_images (product_id, image_url, is_primary)
       VALUES ($1, $2, $3) RETURNING *`,
      [product_id, image_url, is_primary]
    );
    return res.rows[0];
  },

  findByProduct: async (product_id) => {
    const res = await pool.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC',
      [product_id]
    );
    return res.rows;
  },

  delete: async (id) => {
    const res = await pool.query('DELETE FROM product_images WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  },

  deleteByProduct: async (product_id) => {
    await pool.query('DELETE FROM product_images WHERE product_id = $1', [product_id]);
  }
};

module.exports = ProductImage;