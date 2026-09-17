const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const styleController = require('../controllers/styleController');
const auth = require('../middleware/auth');

const validateStyle = [
    body('key').trim().notEmpty().withMessage('La clave es obligatoria').isLength({ max: 50 }),
    body('label').trim().notEmpty().withMessage('La etiqueta es obligatoria').isLength({ max: 100 }),
    body('sort_order').optional().isInt().withMessage('El orden debe ser un número entero').toInt(),
];

const validateId = param('id').isInt({ min: 1 }).withMessage('ID inválido');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

router.get('/', styleController.getStyles);
router.post('/', auth, validateStyle, handleValidation, styleController.createStyle);
router.put('/:id', auth, validateId, validateStyle, handleValidation, styleController.updateStyle);
router.delete('/:id', auth, validateId, handleValidation, styleController.deleteStyle);

module.exports = router;