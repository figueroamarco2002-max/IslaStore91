const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/auth');

// ================================================================
// LISTA BLANCA DE CLAVES DE SECCIÓN (solo estas son válidas)
// ================================================================
const SECTION_KEYS = [
    'gorras_hombre', 'urbano_hombre', 'deportivo_hombre', 'relojes_hombre',
    'gorras_mujer', 'urbano_mujer', 'deportivo_mujer', 'relojes_mujer',
    'ig_banner', 'mujeres_banner'
];

// ================================================================
// RUTAS
// ================================================================

// GET / – Obtener todas las configuraciones
router.get('/', settingsController.getSettings);

// PUT /:key – Actualizar una configuración (protegida)
router.put(
    '/:key',
    auth,
    param('key')
        .isIn(SECTION_KEYS).withMessage(`La clave debe ser una de: ${SECTION_KEYS.join(', ')}`),
    body('enabled')
        .isBoolean().withMessage('El valor "enabled" debe ser true o false')
        .toBoolean(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // Solo permitimos el campo 'enabled'
        req.body = { enabled: req.body.enabled };
        next();
    },
    settingsController.updateSetting
);

module.exports = router;