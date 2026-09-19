const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');
const { subirImagen } = require('../utils/supabaseStorage');
const { sendError, isValidId, sanitizeUrl } = require('../utils/security');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

function eliminarArchivoLocalSeguro(imageUrl) {
    if (!imageUrl || !imageUrl.includes('/uploads/')) return;

    const relative = imageUrl.split('/uploads/')[1];
    if (!relative) return;

    const filePath = path.normalize(path.join(UPLOADS_DIR, relative));

    if (!filePath.startsWith(UPLOADS_DIR + path.sep) && filePath !== UPLOADS_DIR) {
        console.error('Intento de eliminar archivo fuera de uploads:', imageUrl);
        return;
    }

    fs.unlink(filePath, (err) => { if (err) console.error(err); });
}

// Con upload.fields(), req.files es un objeto { images: [...], image: [...] }
// en vez del req.file de antes. 'images' (plural, varias fotos) tiene
// prioridad; 'image' (singular) se mantiene por compatibilidad con
// formularios que todavía no se actualizaron a mandar varias.
function extraerArchivosSubidos(req) {
    if (!req.files) return [];
    if (req.files.images && req.files.images.length > 0) return req.files.images;
    if (req.files.image && req.files.image.length > 0) return req.files.image;
    return [];
}

exports.getProducts = async (req, res) => {
    const { categoria, estilo, tipo, search } = req.query;
    try {
        const products = await Product.findAll({ categoria, estilo, tipo, search });
        for (let p of products) {
            const images = await ProductImage.findByProduct(p.id);
            p.imagen = images.length > 0 ? images[0].image_url : null;
            p.images = images.map(img => img.image_url);
        }
        res.json(products);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener productos', error);
    }
};

exports.getProductById = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto inválido' });

    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const images = await ProductImage.findByProduct(id);
        product.images = images.map(img => img.image_url);
        res.json(product);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener producto', error);
    }
};

exports.createProduct = async (req, res) => {
    const { name, description, price, stock, category_id, estilo, tipo, image } = req.body;

    try {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        if (name.trim().length > 150) {
            return res.status(400).json({ error: 'El nombre es demasiado largo' });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ error: 'El precio debe ser un número mayor que 0' });
        }

        const categoryIdNum = parseInt(category_id, 10);
        if (isNaN(categoryIdNum) || categoryIdNum < 1) {
            return res.status(400).json({ error: 'category_id debe ser un número entero positivo' });
        }

        const stockNum = parseInt(stock, 10) || 0;
        if (stockNum < 0) {
            return res.status(400).json({ error: 'El stock no puede ser negativo' });
        }

        // Si viene una URL externa de imagen, se valida y se normaliza.
        // Se guarda la versión normalizada (url.href), nunca el texto tal
        // como lo mandó el usuario, para que no pueda contener comillas
        // u otros caracteres que rompan el atributo src="" al renderizarse.
        let sanitizedImageUrl = null;
        if (image && typeof image === 'string' && image.trim() !== '') {
            sanitizedImageUrl = sanitizeUrl(image);
            if (!sanitizedImageUrl) {
                return res.status(400).json({ error: 'La URL de la imagen no es válida' });
            }
        }

        const cleanDescription = (description && typeof description === 'string') ? description.trim().slice(0, 5000) : '';
        const cleanEstilo = (estilo && typeof estilo === 'string') ? estilo.trim().slice(0, 100) : '';
        const cleanTipo = (tipo && typeof tipo === 'string') ? tipo.trim().slice(0, 100) : '';

        const productData = {
            name: name.trim(),
            description: cleanDescription,
            price: priceNum,
            stock: stockNum,
            category_id: categoryIdNum,
            estilo: cleanEstilo,
            tipo: cleanTipo
        };

        const product = await Product.create(productData);

        // Fotos: 100% opcionales. Si llegan archivos (uno o varios), se suben
        // todos a Supabase; la primera se marca como portada (is_primary).
        // Si no llega ningún archivo pero sí una URL externa, se mantiene el
        // comportamiento anterior (una sola foto por URL).
        const archivosSubidos = extraerArchivosSubidos(req);
        let imageUrls = [];

        if (archivosSubidos.length > 0) {
            imageUrls = await Promise.all(archivosSubidos.map(file => subirImagen(file)));
        } else if (sanitizedImageUrl) {
            imageUrls = [sanitizedImageUrl];
        }

        for (let i = 0; i < imageUrls.length; i++) {
            await ProductImage.create(product.id, imageUrls[i], i === 0);
        }

        res.status(201).json({
            message: 'Producto creado exitosamente',
            product: product,
            images: imageUrls
        });
    } catch (error) {
        return sendError(res, 500, 'Error al crear producto', error);
    }
};

exports.updateProduct = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto inválido' });

    const { name, description, price, stock, category_id, estilo, tipo, image } = req.body;

    try {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ error: 'El precio debe ser un número mayor que 0' });
        }
        const categoryIdNum = parseInt(category_id, 10);
        if (isNaN(categoryIdNum) || categoryIdNum < 1) {
            return res.status(400).json({ error: 'category_id debe ser un número entero positivo' });
        }
        const stockNum = parseInt(stock, 10) || 0;
        if (stockNum < 0) {
            return res.status(400).json({ error: 'El stock no puede ser negativo' });
        }

        let sanitizedImageUrl = null;
        if (image && typeof image === 'string' && image.trim() !== '') {
            sanitizedImageUrl = sanitizeUrl(image);
            if (!sanitizedImageUrl) {
                return res.status(400).json({ error: 'La URL de la imagen no es válida' });
            }
        }

        const productData = {
            name: name.trim(),
            description: (description && typeof description === 'string') ? description.trim().slice(0, 5000) : '',
            price: priceNum,
            stock: stockNum,
            category_id: categoryIdNum,
            estilo: (estilo && typeof estilo === 'string') ? estilo.trim().slice(0, 100) : '',
            tipo: (tipo && typeof tipo === 'string') ? tipo.trim().slice(0, 100) : ''
        };

        const product = await Product.update(id, productData);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Igual que en createProduct: si llegan archivos (uno o varios), se
        // suben todos y reemplazan el set de fotos anterior. Si no llega
        // ningún archivo pero sí una URL externa, se mantiene el
        // comportamiento anterior. Si no llega nada, las fotos actuales del
        // producto no se tocan.
        const archivosSubidos = extraerArchivosSubidos(req);

        if (archivosSubidos.length > 0) {
            const imageUrls = await Promise.all(archivosSubidos.map(file => subirImagen(file)));
            await ProductImage.deleteByProduct(id);
            for (let i = 0; i < imageUrls.length; i++) {
                await ProductImage.create(id, imageUrls[i], i === 0);
            }
        } else if (sanitizedImageUrl) {
            await ProductImage.deleteByProduct(id);
            await ProductImage.create(id, sanitizedImageUrl, true);
        }

        res.json({
            message: 'Producto actualizado',
            product: product
        });
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar producto', error);
    }
};

exports.deleteProduct = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de producto inválido' });

    try {
        const images = await ProductImage.findByProduct(id);
        for (let img of images) {
            eliminarArchivoLocalSeguro(img.image_url);
        }
        await ProductImage.deleteByProduct(id);
        const product = await Product.delete(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar producto', error);
    }
};