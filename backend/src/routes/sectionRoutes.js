const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const sectionController = require('../controllers/sectionController');
const ProductType = require('../models/ProductType');
const ProductStyle = require('../models/ProductStyle');
const auth = require('../middleware/auth');

// style y product_type ya no son listas fijas: se validan contra las
// tablas product_styles / product_types.
const validateSection = [
    body('category').trim().isIn(['hombre', 'mujer']).withMessage('Categoría inválida'),
    body('style')
        .trim()
        .custom(async (value) => {
            const style = await ProductStyle.findByKey(value.toLowerCase());
            if (!style) throw new Error('Estilo no válido');
            return true;
        }),
    body('product_type')
        .trim()
        .custom(async (value) => {
            const type = await ProductType.findByKey(value.toLowerCase());
            if (!type) throw new Error('Tipo de producto no válido');
            return true;
        }),
    body('visible').optional().isBoolean().withMessage('Visible debe ser booleano').toBoolean()
];

const validateId = param('id').isInt({ min: 1 }).withMessage('ID inválido');

const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
};

router.get('/', sectionController.getSections);
router.post('/', auth, validateSection, handleValidation, sectionController.createSection);
router.put('/:id', auth, validateId, validateSection, handleValidation, sectionController.updateSection);
router.patch('/:id/toggle', auth, validateId, body('visible').isBoolean(), handleValidation, sectionController.toggleSection);
router.delete('/:id', auth, validateId, handleValidation, sectionController.deleteSection);

module.exports = router;