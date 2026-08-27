const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
require('dotenv').config();

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const emailNormalizado = email.trim().toLowerCase();

    try {
        const admin = await Admin.findByEmail(emailNormalizado);
        if (!admin) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
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