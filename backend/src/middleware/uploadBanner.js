const multer = require('multer');

/**
 * Middleware de subida dedicado para las imágenes del banner "Próxima Vez".
 *
 * Diferencias con uploadProductImages (upload.js):
 *  - Acepta varios formatos de imagen comunes, pero NO SVG (puede
 *    contener <script> embebido → XSS almacenado). Misma política
 *    de seguridad que upload.js.
 *  - El límite de archivos es 10 (vs. 6 de productos).
 *  - El campo del formulario se llama 'banner_images'.
 *  - El tamaño máximo por archivo es 5 MB (igual que productos).
 */

const storage = multer.memoryStorage();

// Whitelist explícita. NO incluye image/svg+xml a propósito.
const ALLOWED_BANNER_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/bmp',
    'image/tiff'
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_BANNER_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato no permitido. Usá JPG, PNG, WEBP, GIF, AVIF, BMP o TIFF.'), false);
    }
};

const MAX_BANNER_IMAGES = 10;

const multerBanner = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB por archivo
        files: MAX_BANNER_IMAGES
    }
});

const uploadBannerImages = multerBanner.array('banner_images', MAX_BANNER_IMAGES);

uploadBannerImages.MAX_BANNER_IMAGES = MAX_BANNER_IMAGES;

module.exports = uploadBannerImages;