// src/controllers/categoryController.js
const Category = require('../models/Category');
const Product = require('../models/Product'); // para verificar si una categoría está en uso
const { sendError, isValidId } = require('../utils/security');
const slugify = require('../utils/slugify');

// Pública: la tienda necesita la lista de categorías
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json(categories);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener las categorías', error);
    }
};

// Crear categoría (protegida)
exports.createCategory = async (req, res) => {
    const { name, slug } = req.body;

    try {
        const cleanName = name.trim();
        const cleanSlug = slug ? slug.trim() : slugify(cleanName);

        // Guarda contra el caso borde de slugify(): si el nombre no tiene
        // ninguna letra/número latino (ej. solo emojis o símbolos), el slug
        // generado queda vacío. Un slug vacío nunca pasa por isSlug() porque
        // esa validación de ruta solo corre sobre el slug que el usuario
        // escribe a mano, no sobre el generado aquí — sin esta guarda se
        // colaría directo a la base de datos.
        if (!cleanSlug) {
            return res.status(400).json({ error: 'No se pudo generar un slug a partir de ese nombre. Usa un nombre con al menos una letra o número, o escribe un slug manualmente.' });
        }

        const existingByName = await Category.findByName(cleanName);
        if (existingByName) {
            return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
        }

        const existingBySlug = await Category.findBySlug(cleanSlug);
        if (existingBySlug) {
            return res.status(400).json({ error: 'Ya existe una categoría con ese slug' });
        }

        const category = await Category.create(cleanName, cleanSlug);
        res.status(201).json({
            message: 'Categoría creada exitosamente',
            category,
        });
    } catch (error) {
        return sendError(res, 500, 'Error al crear categoría', error);
    }
};

// Actualizar categoría (protegida)
exports.updateCategory = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de categoría inválido' });

    const { name, slug } = req.body;

    try {
        const existing = await Category.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        const cleanName = name.trim();
        const cleanSlug = slug ? slug.trim() : slugify(cleanName);

        if (!cleanSlug) {
            return res.status(400).json({ error: 'No se pudo generar un slug a partir de ese nombre. Usa un nombre con al menos una letra o número, o escribe un slug manualmente.' });
        }

        const duplicateName = await Category.findByName(cleanName);
        if (duplicateName && duplicateName.id !== id) {
            return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre' });
        }

        const duplicateSlug = await Category.findBySlug(cleanSlug);
        if (duplicateSlug && duplicateSlug.id !== id) {
            return res.status(400).json({ error: 'Ya existe otra categoría con ese slug' });
        }

        const updated = await Category.update(id, cleanName, cleanSlug);
        res.json({
            message: 'Categoría actualizada',
            category: updated,
        });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar categoría', error);
    }
};

// Eliminar categoría (protegida)
exports.deleteCategory = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de categoría inválido' });

    try {
        const existing = await Category.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        const productCount = await Product.countByCategory(id);
        if (productCount > 0) {
            return res.status(400).json({
                error: `No se puede eliminar la categoría porque tiene ${productCount} producto(s) asociado(s)`,
            });
        }

        const deleted = await Category.delete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        res.json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar categoría', error);
    }
};