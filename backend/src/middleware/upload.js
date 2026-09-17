const multer = require('multer');

const storage = multer.memoryStorage();

// Whitelist explícita: NO incluye image/svg+xml a propósito.
// Los SVG pueden contener <script> embebido y son un vector de XSS
// si se sirven o se abren directamente en el navegador.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máximo por archivo
    files: 1                    // un solo archivo por petición
  }
});

module.exports = upload;