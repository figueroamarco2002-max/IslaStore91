const express = require('express');
const router = express.Router();
const { body, param, oneOf, validationResult } = require('express-validator');
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimiter');

// ================================================================
// VALIDACIÓN DE CONTACTO (pública)
// ================================================================
// NOTA: se quitó .escape() de nombre y comentario por la misma razón que en
// productRoutes.js: corrompe texto legítimo con apóstrofes o & al guardarlo
// ("O'Brien", "me gustó, ¿tienen tallas M?"). El escape para mostrarlo ya
// ocurre en el frontend (escapeHTML) al renderizar, que es el lugar correcto.
const validateContact = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres'),
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('Correo electrónico inválido')
        .normalizeEmail(),
    body('telefono')
        .optional()
        .trim()
        .isMobilePhone('es-VE').withMessage('Número de teléfono inválido para Venezuela'),
    body('comentario')
        .trim()
        .notEmpty().withMessage('El comentario es obligatorio')
        .isLength({ max: 1000 }).withMessage('El comentario no puede exceder 1000 caracteres'),
];

// Acepta un :id que sea entero positivo O UUID v4.
const validateId = oneOf(
    [
        param('id').isInt({ min: 1 }),
        param('id').isUUID(4)
    ],
    { message: 'ID de mensaje inválido' }
);

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ================================================================
// RUTAS
// ================================================================

router.post(
    '/',
    contactLimiter,
    validateContact,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const allowedFields = ['nombre', 'correo', 'telefono', 'comentario'];
        const sanitizedBody = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sanitizedBody[field] = req.body[field];
            }
        });
        req.body = sanitizedBody;
        next();
    },
    contactController.createContact
);

router.get('/', auth, contactController.getContacts);

router.put(
    '/:id/leido',
    auth,
    validateId,
    handleValidation,
    contactController.markAsRead
);

router.delete(
    '/:id',
    auth,
    validateId,
    handleValidation,
    contactController.deleteContact
);

module.exports = router;