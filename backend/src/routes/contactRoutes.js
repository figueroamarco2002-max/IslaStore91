const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');
const { contactLimiter } = require('../middleware/rateLimiter');

// Pública: cualquier visitante puede enviar un mensaje (con límite de envíos por IP)
router.post('/', contactLimiter, contactController.createContact);

// Protegidas: solo el admin puede ver/gestionar mensajes
router.get('/', auth, contactController.getContacts);
router.put('/:id/leido', auth, contactController.markAsRead);
router.delete('/:id', auth, contactController.deleteContact);

module.exports = router;