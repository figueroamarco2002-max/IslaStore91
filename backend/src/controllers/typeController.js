const ProductType = require('../models/ProductType');
const Product = require('../models/Product');
const Section = require('../models/Section');
const { sendError, isValidId } = require('../utils/security');

const KEY_REGEX = /^[a-z0-9-]+$/;

// Pública: el sitio y el panel necesitan la lista de tipos
exports.getTypes = async (req, res) => {
    try {
        const types = await ProductType.findAll();
        res.json(types);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener los tipos de producto', error);
    }
};

// Crear tipo (protegida)
exports.createType = async (req, res) => {
    const { key, label, sort_order } = req.body;

    if (!key || typeof key !== 'string' || !KEY_REGEX.test(key.trim().toLowerCase())) {
        return res.status(400).json({ error: 'La clave debe contener solo minúsculas, números y guiones (ej. "zapatos")' });
    }
    if (!label || typeof label !== 'string' || label.trim() === '') {
        return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }

    const cleanKey = key.trim().toLowerCase();
    const cleanLabel = label.trim().slice(0, 100);
    const order = Number.isInteger(sort_order) ? sort_order : 0;

    try {
        const existing = await ProductType.findByKey(cleanKey);
        if (existing) {
            return res.status(400).json({ error: 'Ya existe un tipo con esa clave' });
        }
        const type = await ProductType.create(cleanKey, cleanLabel, order);
        res.status(201).json({ message: 'Tipo creado exitosamente', type });
    } catch (error) {
        return sendError(res, 500, 'Error al crear el tipo', error);
    }
};

// Actualizar tipo (protegida) — si cambia la clave, se propaga a
// productos y secciones que ya la usaban, para que no queden huérfanos.
exports.updateType = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de tipo inválido' });

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
        const existingType = await ProductType.findById(id);
        if (!existingType) return res.status(404).json({ error: 'Tipo no encontrado' });

        const duplicate = await ProductType.findByKey(cleanKey);
        if (duplicate && duplicate.id !== id) {
            return res.status(400).json({ error: 'Ya existe otro tipo con esa clave' });
        }

        if (existingType.key.toLowerCase() !== cleanKey) {
            await Product.renameTipo(existingType.key, cleanKey);
            await Section.renameProductType(existingType.key, cleanKey);
        }

        const updated = await ProductType.update(id, cleanKey, cleanLabel, order);
        res.json({ message: 'Tipo actualizado', type: updated });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar el tipo', error);
    }
};

// Eliminar tipo (protegida)
exports.deleteType = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de tipo inválido' });

    try {
        const existing = await ProductType.findById(id);
        if (!existing) return res.status(404).json({ error: 'Tipo no encontrado' });

        const productCount = await Product.countByType(existing.key);
        const sectionCount = await Section.countByProductType(existing.key);
        if (productCount > 0 || sectionCount > 0) {
            return res.status(400).json({
                error: `No se puede eliminar: hay ${productCount} producto(s) y ${sectionCount} sección(es) usando este tipo`
            });
        }

        await ProductType.delete(id);
        res.json({ message: 'Tipo eliminado correctamente' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar el tipo', error);
    }
};