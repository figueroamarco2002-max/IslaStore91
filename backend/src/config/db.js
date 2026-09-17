const { Pool } = require('pg');
require('dotenv').config();

// Si existe DATABASE_URL (Supabase/Producción), usa la URL completa con SSL.
// De lo contrario (Local sin DATABASE_URL), usa las variables individuales sin SSL.
const pool = process.env.DATABASE_URL
  ? new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,                      // máximo de clientes simultáneos en el pool
    idleTimeoutMillis: 30000,     // cierra clientes inactivos tras 30s
    connectionTimeoutMillis: 5000 // falla rápido si no logra conectar en 5s
  })
  : new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'jrstore',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });

// Prueba de conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error al conectar a PostgreSQL:', err.stack);
  }
  console.log('✅ Conexión a PostgreSQL establecida con éxito');
  release();
});

// IMPORTANTE: pool es un EventEmitter. Si un cliente inactivo emite un error
// (ej. Supabase cierra una conexión ociosa, o hay un corte de red) y no hay
// un listener aquí, Node.js trata ese error como no manejado y tumba todo
// el proceso, aunque el servidor esté funcionando bien en ese momento.
pool.on('error', (err) => {
  console.error('❌ Error inesperado en un cliente inactivo del pool:', err);
});

module.exports = pool;