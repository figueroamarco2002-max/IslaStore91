const express = require('express');
const router = express.Router();
const { body, param, oneOf, validationResult } = require('express-validator');
const productController = require('../controllers/productController');
const ProductType = require('../models/ProductType');
const ProductStyle = require('../models/ProductStyle');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// ================================================================
// VALIDACIONES REUTILIZABLES
// ================================================================
// tipo/estilo ya NO son listas fijas: se validan contra las tablas
// product_types / product_styles, para que agregar/quitar un tipo o
// estilo desde el admin se refleje aquí sin tocar código.
const validateProduct = [
    body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),
    body('price')
        .isFloat({ min: 0.01 }).withMessage('El precio debe ser un número mayor a 0')
        .toFloat(),
    body('category_id')
        .isInt({ min: 1 }).withMessage('Categoría inválida')
        .toInt(),
    body('tipo')
        .optional()
        .trim()
        .custom(async (value) => {
            const type = await ProductType.findByKey(value.toLowerCase());
            if (!type) throw new Error('Tipo de producto no válido');
            return true;
        }),
    body('estilo')
        .optional()
        .trim()
        .custom(async (value) => {
            const style = await ProductStyle.findByKey(value.toLowerCase());
            if (!style) throw new Error('Estilo no válido');
            return true;
        }),
    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock debe ser un número entero no negativo')
        .toInt(),
    body('mostrar_en_home')
        .optional()
        .isIn(['true', 'false']).withMessage('mostrar_en_home debe ser "true" o "false"'),
];

const validateId = oneOf(
    [
        param('id').isInt({ min: 1 }),
        param('id').isUUID(4)
    ],
    { message: 'ID de producto inválido' }
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

router.get('/', productController.getProducts);

router.get(
    '/:id',
    validateId,
    handleValidation,
    productController.getProductById
);

router.post(
    '/',
    auth,
    upload,
    validateProduct,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const allowedFields = ['name', 'price', 'category_id', 'tipo', 'estilo', 'description', 'stock', 'mostrar_en_home'];
        const sanitizedBody = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sanitizedBody[field] = req.body[field];
            }
        });
        req.body = sanitizedBody;
        next();
    },
    productController.createProduct
);

router.put(
    '/:id',
    auth,
    upload,
    validateId,
    validateProduct,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const allowedFields = ['name', 'price', 'category_id', 'tipo', 'estilo', 'description', 'stock', 'mostrar_en_home'];
        const sanitizedBody = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                sanitizedBody[field] = req.body[field];
            }
        });
        req.body = sanitizedBody;
        next();
    },
    productController.updateProduct
);

router.delete(
    '/:id',
    auth,
    validateId,
    handleValidation,
    productController.deleteProduct
);

module.exports = router;