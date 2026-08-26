const pool = require('../config/db');

const Admin = {
  // Esta es la función que Node.js estaba buscando y no encontraba
  async findByEmail(email) {
    try {
      const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      console.error('Error al buscar admin por email:', error);
      throw error;
    }
  }
};

module.exports = Admin;