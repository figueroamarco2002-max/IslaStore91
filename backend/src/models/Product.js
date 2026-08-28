const pool = require('../config/db');

// Prefijo de 3 letras según el tipo de prenda
const TIPO_PREFIX = {
  ropa: 'ROP',
  gorra: 'GOR',
  reloj: 'REL'
};

// Genera el siguiente código disponible para ese tipo (ej: JR-ROP-0001, JR-ROP-0002...)
async function generateSku(tipo) {
  const prefix = TIPO_PREFIX[(tipo || '').toLowerCase()] || 'GEN';
  const likePattern = `JR-${prefix}-%`;

  const res = await pool.query(
    `SELECT sku FROM products WHERE sku LIKE $1 ORDER BY sku DESC LIMIT 1`,
    [likePattern]
  );

  let nextNumber = 1;
  if (res.rows.length > 0 && res.rows[0].sku) {
    const partes = res.rows[0].sku.split('-');
    const ultimoNumero = parseInt(partes[partes.length - 1], 10);
    if (!isNaN(ultimoNumero)) nextNumber = ultimoNumero + 1;
  }

  const numeroFormateado = String(nextNumber).padStart(4, '0');
  return `JR-${prefix}-${numeroFormateado}`;
}

const Product = {
  findAll: async (filters = {}) => {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    const values = [];
    let conditions = [];

    if (filters.categoria && filters.categoria !== 'Todos') {
      conditions.push(`c.name = $${values.length + 1}`);
      values.push(filters.categoria);
    }
    if (filters.estilo && filters.estilo !== 'Todos') {
      conditions.push(`p.estilo = $${values.length + 1}`);
      values.push(filters.estilo);
    }
    if (filters.tipo && filters.tipo !== 'Todos') {
      conditions.push(`p.tipo = $${values.length + 1}`);
      values.push(filters.tipo);
    }
    if (filters.search && filters.search.trim() !== '') {
      conditions.push(`p.name ILIKE $${values.length + 1}`);
      values.push(`%${filters.search.trim()}%`);
    }

    if (conditions.length) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';
    const res = await pool.query(query, values);
    return res.rows;
  },

  findById: async (id) => {
    const res = await pool.query(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return res.rows[0];
  },

  create: async (productData) => {
    const { name, description, price, stock, category_id, estilo, tipo } = productData;
    const sku = await generateSku(tipo);
    const res = await pool.query(
      `INSERT INTO products (name, description, price, stock, category_id, estilo, tipo, sku)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description, price, stock, category_id, estilo, tipo, sku]
    );
    return res.rows[0];
  },

  update: async (id, productData) => {
    const { name, description, price, stock, category_id, estilo, tipo } = productData;
    const res = await pool.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, stock = $4, 
           category_id = $5, estilo = $6, tipo = $7, updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name, description, price, stock, category_id, estilo, tipo, id]
    );
    return res.rows[0];
  },

  delete: async (id) => {
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    return res.rows[0];
  }
};

module.exports = Product;