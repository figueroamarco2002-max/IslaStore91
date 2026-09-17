// src/models/Product.js
const pool = require('../config/db');

// Prefijo de 3 letras según el tipo de prenda
const TIPO_PREFIX = {
  ropa: 'ROP',
  gorra: 'GOR',
  reloj: 'REL'
};

// Claves fijas para pg_advisory_xact_lock, una por prefijo posible.
const LOCK_KEYS = { ROP: 90001, GOR: 90002, REL: 90003, GEN: 90099 };

// Genera el siguiente código disponible para ese tipo (ej: JR-ROP-0001, JR-ROP-0002...)
// Recibe un "client" (no el pool) porque debe ejecutarse dentro de la misma
// transacción que el INSERT, para que el advisory lock tenga efecto.
async function generateSku(client, tipo) {
  const prefix = TIPO_PREFIX[(tipo || '').toLowerCase()] || 'GEN';
  const likePattern = `JR-${prefix}-%`;

  const res = await client.query(
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
      // ILIKE sin comodines equivale a un "=" insensible a mayúsculas/minúsculas.
      // Necesario porque las secciones de home guardan 'hombre'/'mujer' en
      // minúsculas, mientras que categories.name se guarda como 'Hombre'/'Mujer'.
      conditions.push(`c.name ILIKE $${values.length + 1}`);
      values.push(filters.categoria);
    }
    if (filters.estilo && filters.estilo !== 'Todos') {
      // Mismo caso: sections.style guarda 'urbano'/'deportivo', products.estilo
      // guarda 'Urbano'/'Deportivo'.
      conditions.push(`p.estilo ILIKE $${values.length + 1}`);
      values.push(filters.estilo);
    }
    if (filters.tipo && filters.tipo !== 'Todos') {
      conditions.push(`p.tipo ILIKE $${values.length + 1}`);
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Serializa la generación de SKU por tipo de prenda: mientras esta
      // transacción tiene el lock, ninguna otra puede calcular un SKU para
      // el mismo prefijo hasta que esta termine (COMMIT o ROLLBACK).
      const prefix = TIPO_PREFIX[(tipo || '').toLowerCase()] || 'GEN';
      await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_KEYS[prefix]]);

      const sku = await generateSku(client, tipo);

      const res = await client.query(
        `INSERT INTO products (name, description, price, stock, category_id, estilo, tipo, sku)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, description, price, stock, category_id, estilo, tipo, sku]
      );

      await client.query('COMMIT');
      return res.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
  },

  // Cuenta productos activos de una categoría (usado para impedir borrar
  // una categoría que todavía tiene productos asociados).
  countByCategory: async (categoryId) => {
    const res = await pool.query(
      'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
      [categoryId]
    );
    return parseInt(res.rows[0].count, 10);
  },

  // Cuenta productos activos que usan un tipo/estilo dado (para impedir
  // borrar un tipo o estilo todavía en uso). ILIKE por si hay diferencias
  // de mayúsculas entre lo guardado y la clave actual.
  countByType: async (typeKey) => {
    const res = await pool.query(
      'SELECT COUNT(*) FROM products WHERE tipo ILIKE $1 AND is_active = true',
      [typeKey]
    );
    return parseInt(res.rows[0].count, 10);
  },
  countByEstilo: async (styleKey) => {
    const res = await pool.query(
      'SELECT COUNT(*) FROM products WHERE estilo ILIKE $1 AND is_active = true',
      [styleKey]
    );
    return parseInt(res.rows[0].count, 10);
  },

  // Propaga el renombrado de una clave de tipo/estilo a todos los
  // productos que la usaban, para que no queden huérfanos.
  renameTipo: async (oldKey, newKey) => {
    await pool.query('UPDATE products SET tipo = $1 WHERE tipo ILIKE $2', [newKey, oldKey]);
  },
  renameEstilo: async (oldKey, newKey) => {
    await pool.query('UPDATE products SET estilo = $1 WHERE estilo ILIKE $2', [newKey, oldKey]);
  }
};

module.exports = Product;