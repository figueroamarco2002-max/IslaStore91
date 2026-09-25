const ProximaVezImage = require('../models/ProximaVezImage');
const ProximaVezSettings = require('../models/ProximaVezSettings');
const { subirImagen, eliminarImagen } = require('../utils/supabaseStorage');
const { sendError, isValidId } = require('../utils/security');

const MAX_IMAGES = 10;
const SUBFOLDER = 'proxima-vez';

// ────────────────────────────────────────────────────────────────
// ENDPOINTS PÚBLICOS (sin autenticación)
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/proxima-vez
 * Devuelve la configuración (title, subtitle, banner_visible) y las
 * imágenes activas. El frontend usa esto para renderizar el carrusel.
 */
exports.getPublic = async (req, res) => {
    try {
        const settings = await ProximaVezSettings.get();
        // Si el banner está desactivado globalmente, no hay nada que mostrar
        if (!settings.banner_visible) {
            return res.json({ banner_visible: false, title: settings.title, subtitle: settings.subtitle, images: [] });
        }
        const images = await ProximaVezImage.findAllActive();
        res.json({ ...settings, images });
    } catch (error) {
        return sendError(res, 500, 'Error al obtener banner Próxima Vez', error);
    }
};

// ────────────────────────────────────────────────────────────────
// ENDPOINTS DE ADMIN (requieren token de autenticación)
// ────────────────────────────────────────────────────────────────

/**
 * GET /api/proxima-vez/admin
 * Devuelve configuración + TODAS las imágenes (activas e inactivas).
 */
exports.getAdmin = async (req, res) => {
    try {
        const settings = await ProximaVezSettings.get();
        const images = await ProximaVezImage.findAll();
        res.json({ ...settings, images });
    } catch (error) {
        return sendError(res, 500, 'Error al obtener datos del admin', error);
    }
};

/**
 * PUT /api/proxima-vez/settings
 * Actualiza título, subtítulo y visibilidad global del banner.
 */
exports.updateSettings = async (req, res) => {
    const { title, subtitle, banner_visible } = req.body;

    const cleanTitle = (title && typeof title === 'string') ? title.trim().slice(0, 200) : 'Próxima Vez';
    const cleanSubtitle = (subtitle && typeof subtitle === 'string') ? subtitle.trim().slice(0, 300) : '';
    const visible = typeof banner_visible === 'boolean' ? banner_visible : true;

    try {
        const updated = await ProximaVezSettings.update({
            title: cleanTitle,
            subtitle: cleanSubtitle,
            banner_visible: visible
        });
        res.json({ message: 'Configuración actualizada', settings: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar configuración', error);
    }
};

/**
 * POST /api/proxima-vez/upload
 * Sube hasta N imágenes al banner (usa middleware uploadBanner).
 * Se valida que el total (existentes + nuevas) no supere MAX_IMAGES.
 */
exports.uploadImages = async (req, res) => {
    const files = req.files; // array de multer
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    try {
        const currentCount = await ProximaVezImage.count();
        const available = MAX_IMAGES - currentCount;

        if (available <= 0) {
            return res.status(400).json({
                error: `Ya tienes ${MAX_IMAGES} imágenes cargadas. Elimina alguna antes de subir más.`
            });
        }

        // Si el usuario sube más de los que caben, aceptar solo los que entran
        const filesToProcess = files.slice(0, available);
        const urls = await Promise.all(
            filesToProcess.map(f => subirImagen(f, SUBFOLDER))
        );

        // Insertar en BD con sort_order = currentCount + índice
        const created = await Promise.all(
            urls.map((url, i) => ProximaVezImage.create(url, currentCount + i))
        );

        res.status(201).json({
            message: `${created.length} imagen(es) subida(s) correctamente`,
            images: created,
            skipped: files.length - filesToProcess.length
        });
    } catch (error) {
        return sendError(res, 500, 'Error al subir imágenes', error);
    }
};

/**
 * PATCH /api/proxima-vez/:id/toggle
 * Activa o desactiva una imagen individual.
 */
exports.toggleImage = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active debe ser booleano' });
    }

    try {
        const updated = await ProximaVezImage.toggleActive(id, is_active);
        if (!updated) return res.status(404).json({ error: 'Imagen no encontrada' });
        res.json({ message: 'Visibilidad actualizada', image: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar imagen', error);
    }
};

/**
 * DELETE /api/proxima-vez/:id
 * Elimina una imagen del banner (solo de la BD; la URL en Supabase
 * se podría limpiar con un job separado si se desea).
 */
exports.deleteImage = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        // 1. Borrar la fila de la DB. Si no existe, cortamos acá.
        const deleted = await ProximaVezImage.delete(id);
        if (!deleted) return res.status(404).json({ error: 'Imagen no encontrada' });

        // 2. Best-effort: borrar el archivo de Supabase Storage. La fila
        // ya está borrada de la DB, así que no rompemos la respuesta si
        // Storage falla (solo queda un archivo huérfano, que no es visible).
        if (deleted.image_url) {
            await eliminarImagen(deleted.image_url);
        }

        res.json({ message: 'Imagen eliminada' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar imagen', error);
    }
};
