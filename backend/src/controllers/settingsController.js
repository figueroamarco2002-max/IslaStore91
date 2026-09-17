const SectionSettings = require('../models/SectionSettings');
const { sendError } = require('../utils/security');

// Solo letras, números, guiones y guiones bajos: evita inyección si la key
// se usa en alguna consulta dinámica o como parte de una ruta/clave de caché.
const KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

// Pública: la tienda necesita saber qué secciones mostrar
exports.getSettings = async (req, res) => {
    try {
        const rows = await SectionSettings.findAll();
        const map = {};
        rows.forEach(r => { map[r.section_key] = r.enabled; });
        res.json(map);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener configuración', error);
    }
};

// Protegida: solo el admin puede activar/desactivar
exports.updateSetting = async (req, res) => {
    const { key } = req.params;
    const { enabled } = req.body;

    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key)) {
        return res.status(400).json({ error: 'Clave de sección inválida' });
    }
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'El campo "enabled" debe ser booleano' });
    }

    try {
        const updated = await SectionSettings.updateOne(key, enabled);
        if (!updated) return res.status(404).json({ error: 'Sección no encontrada' });
        res.json(updated);
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar configuración', error);
    }
};