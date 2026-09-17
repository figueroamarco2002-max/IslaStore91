const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'productos';

// Extensión derivada del mimetype YA VALIDADO por middleware/upload.js,
// nunca del nombre original que manda el cliente. El nombre original puede
// venir sin extensión, con caracteres raros, o con segmentos que incluyan
// "/" o "..", lo que ensuciaría la clave del objeto en el bucket.
const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

// Sube un archivo (buffer de multer) a Supabase Storage y devuelve la URL pública
async function subirImagen(file) {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
        // No debería ocurrir si upload.js ya filtró el mimetype, pero se valida
        // igual aquí como segunda capa de defensa.
        throw new Error('Tipo de imagen no soportado');
    }

    const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(nombreUnico, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        throw new Error(`Error al subir imagen a Supabase: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(nombreUnico);
    return data.publicUrl;
}

module.exports = { subirImagen };