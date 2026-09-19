const multer = require('multer');

/**
 * Middleware de subida dedicado para las imágenes del banner "Próxima Vez".
 *
 * Diferencias con uploadProductImages (upload.js):
 *  - Acepta CUALQUIER tipo de imagen (image/*), no solo jpg/png/webp/gif.
 *    Esto incluye avif, bmp, tiff, heic, etc.
 *  - El límite de archivos es 10 (vs. 6 de productos).
 *  - El campo del formulario se llama 'banner_images'.
 *  - El tamaño máximo por archivo es 5 MB (igual que productos).
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Acepta cualquier mimetype que empiece con 'image/'
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'), false);
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
