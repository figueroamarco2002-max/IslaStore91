const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

// ================================================================
// VALIDACIÓN DE LOGIN
// ================================================================
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('Correo electrónico inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 6, max: 128 }).withMessage('La contraseña debe tener entre 6 y 128 caracteres'),
];

// ================================================================
// RUTA DE LOGIN
// ================================================================
router.post(
    '/login',
    loginLimiter,
    validateLogin,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Limpiamos campos extra (solo email y password)
        const { email, password } = req.body;
        req.body = { email, password };
        next();
    },
    authController.login
);

module.exports = router;