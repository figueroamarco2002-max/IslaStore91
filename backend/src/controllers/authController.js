const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { isValidEmail } = require('../utils/security');
require('dotenv').config();

// Hash "señuelo" precomputado (bcrypt de una cadena aleatoria).
// Se usa para que bcrypt.compare tarde lo mismo exista o no el admin,
// evitando que un atacante deduzca correos válidos por diferencia de tiempo.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q5oc0Mvj0v/1n6y2q2GfV3H2h4kzS';

exports.login = async (req, res) => {
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET no está configurado en las variables de entorno');
        return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const emailNormalizado = email.trim().toLowerCase();

    try {
        const admin = await Admin.findByEmail(emailNormalizado);

        // Siempre se ejecuta bcrypt.compare, exista o no el admin,
        // para no filtrar por tiempo de respuesta si el correo existe.
        const hashParaComparar = admin ? admin.password_hash : DUMMY_HASH;
        const match = await bcrypt.compare(password, hashParaComparar);

        if (!admin || !match) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (error) {
        console.error('🔥 Error en login:', error.message);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};