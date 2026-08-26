const { Pool } = require('pg');
require('dotenv').config();

// Si existe DATABASE_URL (Railway/Producción), usa la URL completa.
// De lo contrario (Local), usa las variables individuales.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'jrstore',
    });
// Probar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error al conectar a PostgreSQL:', err.stack);
  }
  console.log('✅ Conexión a PostgreSQL establecida con éxito');
  release();
});

module.exports = pool;
