const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
require('dotenv').config();

exports.login = async (req, res) => {
    console.log('-----------------------------------');
    console.log('🔍 INTENTO DE LOGIN RECIBIDO:', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
        console.log('❌ Faltan datos (email o password)');
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    try {
        const admin = await Admin.findByEmail(email);
        if (!admin) {
            console.log('❌ El correo no existe en la base de datos');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
            console.log('❌ La contraseña no coincide con el hash');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Login exitoso, enviando token');
        res.json({ token, admin: { id: admin.id, email: admin.email } });
    } catch (error) {
        console.log('🔥 ERROR GRAVE EN EL SERVIDOR:');
        console.error(error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
};