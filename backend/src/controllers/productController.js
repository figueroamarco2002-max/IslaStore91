const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

// Obtener productos con filtros
exports.getProducts = async (req, res) => {
    const { categoria, estilo, tipo, search } = req.query;
    try {
        const products = await Product.findAll({ categoria, estilo, tipo, search });
        for (let p of products) {
            const images = await ProductImage.findByProduct(p.id);
            p.imagen = images.length > 0 ? images[0].image_url : null;
        }
        res.json(products);
    } catch (error) {
        console.error('Error en getProducts:', error);
        res.status(500).json({ error: 'Error al obtener productos', detalle: error.message });
    }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const images = await ProductImage.findByProduct(id);
        product.imagenes = images;
        res.json(product);
    } catch (error) {
        console.error('Error en getProductById:', error);
        res.status(500).json({ error: 'Error al obtener producto', detalle: error.message });
    }
};

// ✅ CREAR PRODUCTO (CORREGIDO)
exports.createProduct = async (req, res) => {
    // Extraer campos del body (multer los coloca en req.body)
    const { name, description, price, stock, category_id, estilo, tipo, image } = req.body;

    try {
        // --- 1. Validaciones y conversiones ---
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ error: 'El precio debe ser un número mayor que 0' });
        }

        // Convertir category_id a entero
        const categoryIdNum = parseInt(category_id, 10);
        if (isNaN(categoryIdNum) || categoryIdNum < 1) {
            return res.status(400).json({ error: 'category_id debe ser un número entero positivo (1=Hombre, 2=Mujer)' });
        }

        // Convertir stock a entero (si no viene, usamos 0)
        const stockNum = parseInt(stock, 10) || 0;

        // Limpiar strings
        const cleanDescription = (description && typeof description === 'string') ? description.trim() : '';
        const cleanEstilo = (estilo && typeof estilo === 'string') ? estilo.trim() : '';
        const cleanTipo = (tipo && typeof tipo === 'string') ? tipo.trim() : '';

        // --- 2. Preparar datos para el modelo ---
        const productData = {
            name: name.trim(),
            description: cleanDescription,
            price: priceNum,
            stock: stockNum,
            category_id: categoryIdNum,
            estilo: cleanEstilo,
            tipo: cleanTipo
        };

        console.log('📦 Datos a insertar:', productData); // ← LOG para depurar

        // --- 3. Insertar en la base de datos ---
        const product = await Product.create(productData);
        console.log('✅ Producto creado:', product);

        // --- 4. Manejar imagen (si existe) ---
        let imageUrl = null;
        if (req.file) {
            // Si se subió un archivo con multer
            imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        } else if (image && typeof image === 'string' && image.trim() !== '') {
            // Si se envió una URL externa
            imageUrl = image.trim();
        }

        if (imageUrl) {
            await ProductImage.create(product.id, imageUrl, true);
        }

        // --- 5. Responder ---
        res.status(201).json({
            message: 'Producto creado exitosamente',
            product: product,
            image: imageUrl
        });
    } catch (error) {
        console.error('❌ Error en createProduct:', error);
        // Enviar el error real al frontend (para depuración)
        res.status(500).json({
            error: 'Error al crear producto',
            detalle: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category_id, estilo, tipo, image } = req.body;

    try {
        // Conversiones y validaciones similares
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

        const productData = {
            name: name.trim(),
            description: (description && typeof description === 'string') ? description.trim() : '',
            price: priceNum,
            stock: stockNum,
            category_id: categoryIdNum,
            estilo: (estilo && typeof estilo === 'string') ? estilo.trim() : '',
            tipo: (tipo && typeof tipo === 'string') ? tipo.trim() : ''
        };

        const product = await Product.update(id, productData);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Manejar imagen
        if (req.file) {
            await ProductImage.deleteByProduct(id);
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            await ProductImage.create(id, imageUrl, true);
        } else if (image && typeof image === 'string' && image.trim() !== '') {
            await ProductImage.deleteByProduct(id);
            await ProductImage.create(id, image.trim(), true);
        }

        res.json({
            message: 'Producto actualizado',
            product: product
        });
    } catch (error) {
        console.error('❌ Error en updateProduct:', error);
        res.status(500).json({
            error: 'Error al actualizar producto',
            detalle: error.message
        });
    }
};

// Eliminar producto
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const images = await ProductImage.findByProduct(id);
        for (let img of images) {
            if (img.image_url && img.image_url.includes('/uploads/')) {
                const filePath = path.join(__dirname, '..', '..', 'uploads', img.image_url.split('/uploads/')[1]);
                fs.unlink(filePath, (err) => { if (err) console.error(err); });
            }
        }
        await ProductImage.deleteByProduct(id);
        const product = await Product.delete(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error en deleteProduct:', error);
        res.status(500).json({ error: 'Error al eliminar producto', detalle: error.message });
    }
};