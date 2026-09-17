const ProductStyle = require('../models/ProductStyle');
const Product = require('../models/Product');
const Section = require('../models/Section');
const { sendError, isValidId } = require('../utils/security');

const KEY_REGEX = /^[a-z0-9-]+$/;

exports.getStyles = async (req, res) => {
    try {
        const styles = await ProductStyle.findAll();
        res.json(styles);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener los estilos', error);
    }
};

exports.createStyle = async (req, res) => {
    const { key, label, sort_order } = req.body;

    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key.trim().toLowerCase())) {
        return res.status(400).json({ error: 'La clave debe contener solo minúsculas, números y guiones (ej. "casual")' });
    }
    if (!label || typeof label !== 'string' || label.trim() === '') {
        return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }

    const cleanKey = key.trim().toLowerCase();
    const cleanLabel = label.trim().slice(0, 100);
    const order = Number.isInteger(sort_order) ? sort_order : 0;

    try {
        const existing = await ProductStyle.findByKey(cleanKey);
        if (existing) {
            return res.status(400).json({ error: 'Ya existe un estilo con esa clave' });
        }
        const style = await ProductStyle.create(cleanKey, cleanLabel, order);
        res.status(201).json({ message: 'Estilo creado exitosamente', style });
    } catch (error) {
        return sendError(res, 500, 'Error al crear el estilo', error);
    }
};

exports.updateStyle = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de estilo inválido' });

    const { key, label, sort_order } = req.body;

    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key.trim().toLowerCase())) {
        return res.status(400).json({ error: 'La clave debe contener solo minúsculas, números y guiones' });
    }
    if (!label || typeof label !== 'string' || label.trim() === '') {
        return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }

    const cleanKey = key.trim().toLowerCase();
    const cleanLabel = label.trim().slice(0, 100);
    const order = Number.isInteger(sort_order) ? sort_order : 0;

    try {
        const existingStyle = await ProductStyle.findById(id);
        if (!existingStyle) return res.status(404).json({ error: 'Estilo no encontrado' });

        const duplicate = await ProductStyle.findByKey(cleanKey);
        if (duplicate && duplicate.id !== id) {
            return res.status(400).json({ error: 'Ya existe otro estilo con esa clave' });
        }

        if (existingStyle.key.toLowerCase() !== cleanKey) {
            await Product.renameEstilo(existingStyle.key, cleanKey);
            await Section.renameStyle(existingStyle.key, cleanKey);
        }

        const updated = await ProductStyle.update(id, cleanKey, cleanLabel, order);
        res.json({ message: 'Estilo actualizado', style: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar el estilo', error);
    }
};

exports.deleteStyle = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de estilo inválido' });

    try {
        const existing = await ProductStyle.findById(id);
        if (!existing) return res.status(404).json({ error: 'Estilo no encontrado' });

        const productCount = await Product.countByEstilo(existing.key);
        const sectionCount = await Section.countByStyle(existing.key);
        if (productCount > 0 || sectionCount > 0) {
            return res.status(400).json({
                error: `No se puede eliminar: hay ${productCount} producto(s) y ${sectionCount} sección(es) usando este estilo`
            });
        }

        await ProductStyle.delete(id);
        res.json({ message: 'Estilo eliminado correctamente' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar el estilo', error);
    }
};