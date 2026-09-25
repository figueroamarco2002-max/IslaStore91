// utils/security.js
// Helpers compartidos para respuestas de error consistentes y validaciones básicas.

const isProd = process.env.NODE_ENV === 'production';

/**
 * Responde con un error genérico al cliente y loguea el detalle real en el servidor.
 * En producción nunca se expone error.message ni el stack al cliente.
 */
function sendError(res, status, publicMessage, error) {
    if (error) {
        // Loguear SOLO el mensaje, no el objeto completo, para evitar
        // filtrar parámetros de query (que pueden contener PII) en logs.
        // En producción no logueamos stack; en dev sí, para debug.
        console.error(publicMessage, error.message || error);
        if (!isProd && error.stack) console.error(error.stack);
    }

    // Violación de restricción UNIQUE en Postgres (ej. SKU o slug repetido):
    // es un conflicto de datos, no un error de servidor. Se resuelve como 409
    // con un mensaje entendible, en vez de un 500 genérico.
    if (error && error.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    }

    // Violación de llave foránea (ej. intentar borrar una categoría que
    // quedó referenciada por un producto justo después de la verificación
    // manual, por una condición de carrera). Red de seguridad ante ese caso.
    if (error && error.code === '23503') {
        return res.status(409).json({ error: 'No se puede completar la operación: el registro está siendo referenciado por otros datos' });
    }

    const payload = { error: publicMessage };
    if (!isProd && error) payload.detalle = error.message;
    return res.status(status).json(payload);
}

// UUID v4: 8-4-4-4-12 hex, con el nibble de versión '4' y el de variante 8/9/a/b.
// Coincide con lo que ya exige isUUID(4) de express-validator en las rutas.
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida un ID de ruta/body que puede ser un entero positivo (tablas con
 * SERIAL, ej. sections) o un UUID v4 (ej. products, cuyo id es uuid en la
 * base de datos). Devuelve el número, el UUID en minúsculas, o null si no
 * es válido en ninguno de los dos formatos.
 */
function isValidId(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const str = String(value).trim();

    if (/^\d+$/.test(str)) {
        const n = parseInt(str, 10);
        return n > 0 ? n : null;
    }

    if (UUID_V4_REGEX.test(str)) {
        return str.toLowerCase();
    }

    return null;
}

/**
 * Validación simple pero razonable de formato de email.
 */
function isValidEmail(value) {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Valida una URL externa (debe ser http/https) y devuelve su forma
 * normalizada (url.href): el parser de URL codifica automáticamente
 * comillas, espacios, < y > en sus formas %XX, por lo que el resultado
 * nunca puede romper un atributo HTML como src="" al renderizarse.
 * Devuelve null si la URL no es válida o no usa http/https.
 */
function sanitizeUrl(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url.href;
    } catch {
        return null;
    }
}

module.exports = { sendError, isValidId, isValidEmail, sanitizeUrl, isProd };