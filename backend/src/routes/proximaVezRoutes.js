const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const ctrl = require('../controllers/proximaVezController');
const auth = require('../middleware/auth');
const uploadBanner = require('../middleware/uploadBanner');

// ── Helpers ────────────────────────────────────────────────────
const validateUUID = param('id').isUUID(4).withMessage('ID inválido');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

// ── Manejo de errores de Multer (tamaño, tipo, límite de archivos) ──
function handleUploadError(err, req, res, next) {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Una o más imágenes superan el límite de 5 MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Solo se pueden subir hasta 10 imágenes a la vez' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Campo de archivo inesperado' });
    }

    // Error del fileFilter (formato no permitido) u otro error de multer.
    // Si tiene mensaje, es un error controlado por nosotros → 400.
    // Si no, lo dejamos pasar al handler global.
    if (err.message) {
        return res.status(400).json({ error: err.message });
    }

    next(err);
}

// ── Rutas públicas (sin autenticación) ─────────────────────────
// GET /api/proxima-vez → datos del banner para el frontend
router.get('/', ctrl.getPublic);

// ── Rutas de administración (requieren token JWT) ───────────────
// GET /api/proxima-vez/admin → todos los datos + imágenes inactivas
router.get('/admin', auth, ctrl.getAdmin);

// PUT /api/proxima-vez/settings → actualizar título, subtítulo y visibilidad
router.put(
    '/settings',
    auth,
    [
        body('title').optional().isString().isLength({ max: 200 }).withMessage('Título demasiado largo'),
        body('subtitle').optional().isString().isLength({ max: 300 }).withMessage('Subtítulo demasiado largo'),
        body('banner_visible').optional().isBoolean().toBoolean()
    ],
    handleValidation,
    ctrl.updateSettings
);

// POST /api/proxima-vez/upload → subir imágenes al banner
router.post(
    '/upload',
    auth,
    (req, res, next) => {
        uploadBanner(req, res, (err) => {
            if (err) return handleUploadError(err, req, res, next);
            next();
        });
    },
    ctrl.uploadImages
);

// PATCH /api/proxima-vez/:id/toggle → activar/desactivar imagen
router.patch(
    '/:id/toggle',
    auth,
    validateUUID,
    body('is_active').isBoolean().withMessage('is_active debe ser booleano').toBoolean(),
    handleValidation,
    ctrl.toggleImage
);

// DELETE /api/proxima-vez/:id → eliminar imagen
router.delete(
    '/:id',
    auth,
    validateUUID,
    handleValidation,
    ctrl.deleteImage
);

module.exports = router;
