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
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son obligatorias para subir imágenes.');
}
/**
 * Extrae el path relativo dentro del bucket a partir de una URL pública.
 * Ej: https://xxx.supabase.co/storage/v1/object/public/productos/proxima-vez/123-456.jpg
 *     -> "proxima-vez/123-456.jpg"
 * Devuelve null si la URL no pertenece a este bucket o no tiene el formato esperado.
 */
function pathFromPublicUrl(publicUrl) {
    if (typeof publicUrl !== 'string') return null;
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;

    const encodedPath = publicUrl.slice(idx + marker.length).split('?')[0].split('#')[0];
    try {
        return decodeURIComponent(encodedPath);
    } catch {
        return encodedPath;
    }
}

/**
 * Elimina un archivo de Supabase Storage a partir de su URL pública.
 * Best-effort: nunca lanza. Devuelve true si se eliminó, false si no se
 * pudo (URL inválida, archivo inexistente, error de red, etc.).
 * Pensado para llamarse DESPUÉS de borrar la fila de la DB, para no
 * bloquear la operación principal si Supabase tiene un hipo.
 */
async function eliminarImagen(publicUrl) {
    const path = pathFromPublicUrl(publicUrl);
    if (!path) return false;
    try {
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
        if (error) {
            console.error('Error al eliminar imagen de Supabase:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error inesperado al eliminar imagen de Supabase:', err.message || err);
        return false;
    }
}

module.exports = { subirImagen, eliminarImagen };
