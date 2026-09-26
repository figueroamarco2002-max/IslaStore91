// src/models/Product.js
const pool = require('../config/db');

// Límites de paginación.
// - DEFAULT_LIMIT: si no se especifica limit, traemos hasta esto (evita cuelgues).
// - MAX_LIMIT: techo duro si alguien intenta pedir "todo" con un limit enorme.
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// Deriva el prefijo de 3 letras mayúsculas a partir del tipo del producto.
//   'ropa'      -> 'ROP'
//   'gorra'     -> 'GOR'
//   'reloj'     -> 'REL'
//   'zapatos'   -> 'ZAP'
//   'pulseras'  -> 'PUL'
//   'pantalón'  -> 'PAN'  (acentos se eliminan)
//   '' / null   -> 'GEN'  (fallback; en teoría no debería pasar
//                          porque tipo es obligatorio en productRoutes)
function getPrefixForTipo(tipo) {
  if (!tipo || typeof tipo !== 'string') return 'GEN';
  const clean = tipo
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/[^a-z]/g, '');           // solo letras
  if (!clean) return 'GEN';
  return clean.slice(0, 3).toUpperCase();
}

// Deriva un lock key numérico estable a partir del prefijo. Reemplaza al
// antiguo mapa LOCK_KEYS, que era estático y solo cubría 3 tipos. Es
// determinista entre reinicios y no depende de hashes internos de Postgres.
function lockKeyForPrefix(prefix) {
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    hash = ((hash << 5) - hash) + prefix.charCodeAt(i);
    hash = hash | 0; // forzar int32
  }
  return Math.abs(hash);
}

// Genera el siguiente código disponible para ese tipo (ej: JR-ROP-0001, JR-ROP-0002...)
// Recibe un "client" (no el pool) porque debe ejecutarse dentro de la misma
// transacción que el INSERT, para que el advisory lock tenga efecto.
async function generateSku(client, tipo) {
  const prefix = getPrefixForTipo(tipo);
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

// Construye el WHERE dinámico a partir de los filtros. Se usa tanto en
// findAll como en count, para no duplicar la lógica. `values` se muta
// (agrega los parámetros en orden).
function buildFilterConditions(filters, values) {
  const conditions = [];

  if (filters.categoria && filters.categoria !== 'Todos') {
    conditions.push(`c.name ILIKE $${values.length + 1}`);
    values.push(filters.categoria);
  }
  if (filters.estilo && filters.estilo !== 'Todos') {
    conditions.push(`p.estilo ILIKE $${values.length + 1}`);
    values.push(filters.estilo);
  }
  if (filters.tipo && filters.tipo !== 'Todos') {
    conditions.push(`p.tipo ILIKE $${values.length + 1}`);
    values.push(filters.tipo);
  }
  if (filters.search && filters.search.trim() !== '') {
    // Buscar en nombre, tipo y estilo, para que "gorra" encuentre
    // productos cuyo nombre no contiene la palabra pero su tipo sí.
    const term = `%${filters.search.trim()}%`;
    conditions.push(`(
            p.name ILIKE $${values.length + 1}
            OR p.tipo ILIKE $${values.length + 1}
            OR p.estilo ILIKE $${values.length + 1}
        )`);
    values.push(term);
  }

  return conditions;
}

const Product = {
  findAll: async (filters = {}) => {
    const values = [];
    const conditions = buildFilterConditions(filters, values);

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    if (conditions.length) {
      query += ' AND ' + conditions.join(' AND ');
    }

    let limit = parseInt(filters.limit, 10);
    let offset = parseInt(filters.offset, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (!Number.isInteger(offset) || offset < 0) offset = 0;

    query += ` ORDER BY p.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const res = await pool.query(query, values);
    return res.rows;
  },

  count: async (filters = {}) => {
    const values = [];
    const conditions = buildFilterConditions(filters, values);

    let query = `
      SELECT COUNT(*)::int AS total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    if (conditions.length) {
      query += ' AND ' + conditions.join(' AND ');
    }

    const res = await pool.query(query, values);
    return res.rows[0].total;
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

      // Serializa la generación de SKU por tipo de prenda. El lock key
      // se deriva del prefijo (que a su vez se deriva del tipo), así que
      // funciona para cualquier tipo nuevo sin tocar este archivo.
      const prefix = getPrefixForTipo(tipo);
      await client.query('SELECT pg_advisory_xact_lock($1)', [lockKeyForPrefix(prefix)]);

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

  countByCategory: async (categoryId) => {
    const res = await pool.query(
      'SELECT COUNT(*)::int AS total FROM products WHERE category_id = $1 AND is_active = true',
      [categoryId]
    );
    return res.rows[0].total;
  },

  countByType: async (typeKey) => {
    const res = await pool.query(
      'SELECT COUNT(*)::int AS total FROM products WHERE tipo ILIKE $1 AND is_active = true',
      [typeKey]
    );
    return res.rows[0].total;
  },
  countByEstilo: async (styleKey) => {
    const res = await pool.query(
      'SELECT COUNT(*)::int AS total FROM products WHERE estilo ILIKE $1 AND is_active = true',
      [styleKey]
    );
    return res.rows[0].total;
  },

  renameTipo: async (oldKey, newKey) => {
    await pool.query('UPDATE products SET tipo = $1 WHERE tipo ILIKE $2', [newKey, oldKey]);
  },
  renameEstilo: async (oldKey, newKey) => {
    await pool.query('UPDATE products SET estilo = $1 WHERE estilo ILIKE $2', [newKey, oldKey]);
  }
};

module.exports = Product;