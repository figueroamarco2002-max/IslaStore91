const Section = require('../models/Section');
const ProductType = require('../models/ProductType');
const ProductStyle = require('../models/ProductStyle');
const { sendError, isValidId } = require('../utils/security');

const validCategories = ['hombre', 'mujer'];

exports.getSections = async (req, res) => {
    try {
        const sections = await Section.findAll();
        res.json(sections);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener secciones', error);
    }
};

exports.createSection = async (req, res) => {
    const { category, style, product_type, visible } = req.body;

    if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Datos de sección no válidos' });
    }

    try {
        const styleExists = await ProductStyle.findByKey((style || '').toLowerCase());
        const typeExists = await ProductType.findByKey((product_type || '').toLowerCase());
        if (!styleExists || !typeExists) {
            return res.status(400).json({ error: 'Datos de sección no válidos' });
        }

        const existing = await Section.findByCombination(category, style, product_type);
        if (existing) {
            return res.status(400).json({ error: 'Ya existe una sección con esa combinación' });
        }
        const section = await Section.create(category, style, product_type, visible !== false);
        res.status(201).json({ message: 'Sección creada', section });
    } catch (error) {
        return sendError(res, 500, 'Error al crear sección', error);
    }
};

exports.updateSection = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { category, style, product_type, visible } = req.body;

    if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Datos de sección no válidos' });
    }

    try {
        const styleExists = await ProductStyle.findByKey((style || '').toLowerCase());
        const typeExists = await ProductType.findByKey((product_type || '').toLowerCase());
        if (!styleExists || !typeExists) {
            return res.status(400).json({ error: 'Datos de sección no válidos' });
        }

        const existing = await Section.findById(id);
        if (!existing) return res.status(404).json({ error: 'Sección no encontrada' });

        const duplicate = await Section.findByCombination(category, style, product_type);
        if (duplicate && duplicate.id !== id) {
            return res.status(400).json({ error: 'Ya existe otra sección con esa combinación' });
        }

        const updated = await Section.update(id, category, style, product_type, visible !== false);
        res.json({ message: 'Sección actualizada', section: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar sección', error);
    }
};

exports.toggleSection = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { visible } = req.body;
    if (typeof visible !== 'boolean') return res.status(400).json({ error: 'Visible debe ser booleano' });

    try {
        const updated = await Section.toggleVisible(id, visible);
        if (!updated) return res.status(404).json({ error: 'Sección no encontrada' });
        res.json({ message: 'Visibilidad actualizada', section: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar visibilidad', error);
    }
};

exports.deleteSection = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    try {
        const deleted = await Section.delete(id);
        if (!deleted) return res.status(404).json({ error: 'Sección no encontrada' });
        res.json({ message: 'Sección eliminada' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar sección', error);
    }
};