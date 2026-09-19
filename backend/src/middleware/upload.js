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

// Máximo de fotos por producto. Subir fotos sigue siendo opcional (0 sigue
// siendo válido); esto solo limita cuántas se aceptan cuando sí se suben.
const MAX_PRODUCT_IMAGES = 6;

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máximo por archivo
    files: MAX_PRODUCT_IMAGES
  }
});

// Middleware final que usan las rutas de producto:
// - 'images' (plural): campo nuevo, admite varias fotos (hasta MAX_PRODUCT_IMAGES).
// - 'image' (singular): se mantiene por compatibilidad, por si el formulario
//   del admin todavía no se actualizó a mandar varias fotos.
// Si llegan ambos campos, el controlador prioriza 'images'.
const uploadProductImages = multerUpload.fields([
  { name: 'images', maxCount: MAX_PRODUCT_IMAGES },
  { name: 'image', maxCount: 1 }
]);

uploadProductImages.MAX_PRODUCT_IMAGES = MAX_PRODUCT_IMAGES;

module.exports = uploadProductImages;