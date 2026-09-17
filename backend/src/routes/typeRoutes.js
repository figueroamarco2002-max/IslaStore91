const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const typeController = require('../controllers/typeController');
const auth = require('../middleware/auth');

const validateType = [
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

router.get('/', typeController.getTypes);
router.post('/', auth, validateType, handleValidation, typeController.createType);
router.put('/:id', auth, validateId, validateType, handleValidation, typeController.updateType);
router.delete('/:id', auth, validateId, handleValidation, typeController.deleteType);

module.exports = router;