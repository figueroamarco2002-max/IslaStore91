const pool = require('../config/db');

const Admin = {
  async findByEmail(email) {
    try {
      // Se seleccionan solo las columnas que el login necesita,
      // en vez de SELECT * (evita traer columnas sensibles de más
      // si en el futuro se agregan campos a la tabla admins).
      const result = await pool.query(
        'SELECT id, email, password_hash FROM admins WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error al buscar admin por email:', error);
      throw error;
    }
  }
};

module.exports = Admin;