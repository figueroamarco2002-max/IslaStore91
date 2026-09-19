const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'productos';

// Extensión derivada del mimetype YA VALIDADO por el middleware de subida,
// nunca del nombre original que manda el cliente. Para mimetypes conocidos
// usamos la extensión estándar; para el resto (avif, bmp, tiff, heic…)
// derivamos la extensión del sub-tipo directamente (image/avif -> avif).
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
    'image/heic': 'heic',
    'image/heif': 'heif'
};

/**
 * Deriva la extensión de archivo a partir del mimetype.
 * Para mimetypes no en la tabla, usa el sub-tipo (ej. image/svg+xml -> svg).
 */
function extFromMime(mimetype) {
    if (EXT_BY_MIME[mimetype]) return EXT_BY_MIME[mimetype];
    // Fallback: extraer sub-tipo limpio (image/foo -> foo, image/x-foo -> x-foo)
    const subtype = mimetype.split('/')[1];
    // Eliminar posibles sufijos de vendor (+xml, +json, etc.)
    return (subtype || 'bin').split('+')[0].replace(/[^a-z0-9]/gi, '');
}

/**
 * Sube un archivo (buffer de multer) a Supabase Storage y devuelve la URL pública.
 * @param {object} file       - Objeto de multer con .mimetype y .buffer
 * @param {string} subfolder  - Subcarpeta dentro del bucket (ej. 'proxima-vez').
 *                              Si no se indica, se sube a la raíz del bucket.
 */
async function subirImagen(file, subfolder = '') {
    const ext = extFromMime(file.mimetype);

    // Ruta dentro del bucket: 'subfolder/timestamp-random.ext' o solo
    // 'timestamp-random.ext' si no se especifica subcarpeta.
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const storagePath = subfolder ? `${subfolder}/${filename}` : filename;

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        throw new Error(`Error al subir imagen a Supabase: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return data.publicUrl;
}

module.exports = { subirImagen };