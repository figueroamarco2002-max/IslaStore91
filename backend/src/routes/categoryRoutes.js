// src/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const { body, param, oneOf, validationResult } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');

// NOTA: se quitó .escape() de "name" por la misma razón que en productRoutes.js
// (corrompe nombres como "Café & Boutique" al guardarlos). En "slug" no hacía
// falta quitarlo: isSlug() ya solo permite minúsculas/números/guiones antes de
// que escape() corra, así que ahí nunca tocaba nada — pero se quita igual por
// consistencia y para no dejar el patrón peligroso como ejemplo en el código.
const validateCategory = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres'),
  body('slug')
    .optional()
    .trim()
    .isSlug().withMessage('El slug debe contener solo letras minúsculas, números y guiones')
    .isLength({ max: 150 }).withMessage('El slug no puede exceder 150 caracteres'),
];

// Acepta un :id que sea entero positivo o UUID v4
const validateId = oneOf(
  [
    param('id').isInt({ min: 1 }),
    param('id').isUUID(4)
  ],
  { message: 'ID de categoría inválido' }
);

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET / – pública
router.get('/', categoryController.getCategories);

// POST / – protegida, crear categoría
router.post(
  '/',
  auth,
  validateCategory,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const allowedFields = ['name', 'slug'];
    const sanitizedBody = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    });
    req.body = sanitizedBody;
    next();
  },
  categoryController.createCategory
);

// PUT /:id – protegida, actualizar categoría
router.put(
  '/:id',
  auth,
  validateId,
  validateCategory,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const allowedFields = ['name', 'slug'];
    const sanitizedBody = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    });
    req.body = sanitizedBody;
    next();
  },
  categoryController.updateCategory
);

// DELETE /:id – protegida, eliminar categoría
router.delete(
  '/:id',
  auth,
  validateId,
  handleValidation,
  categoryController.deleteCategory
);

module.exports = router;