const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Category = require('../models/Category');
const Section = require('../models/Section');
const fs = require('fs');
const path = require('path');
const { subirImagen, eliminarImagen } = require('../utils/supabaseStorage');
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

// ====================================================================
// SINCRONIZACIÓN AUTOMÁTICA CON "GESTIÓN DE SECCIONES DE HOME"
// Al crear/editar un producto, nos aseguramos de que exista una
// sección de home para SU categoría+estilo+tipo (ej: "Zapatos Casual
// Hombre"), con la visibilidad que el admin eligió en el checkbox
// "Mostrar en la página principal". Y de paso, se crea también la
// sección espejo para la OTRA categoría (ej: "Zapatos Casual Mujer"),
// siempre oculta por defecto, para que el admin decida manualmente
// más adelante si la activa desde "Gestión de Secciones de Home" —
// sin tener que crearla a mano él mismo.
// ====================================================================
async function ensureHomeSections(estilo, tipo, categoryName, mostrarEnHome) {
    if (!estilo || !tipo || !categoryName) {
        console.log('🔎 [ensureHomeSections] Se omite: falta estilo, tipo o categoría.', { estilo, tipo, categoryName });
        return;
    }

    const styleKey = estilo.toLowerCase().trim();
    const typeKey = tipo.toLowerCase().trim();
    const categoriaNombreNormalizada = categoryName.toLowerCase().trim();

    // Tolerante a variantes como "Hombres", "Hombre ", " hombre", etc.
    // (la tabla sections solo acepta 'hombre'/'mujer' exactos, así que
    // igual normalizamos al valor correcto antes de guardar).
    let categoriaProducto = null;
    if (categoriaNombreNormalizada.includes('hombre')) categoriaProducto = 'hombre';
    else if (categoriaNombreNormalizada.includes('mujer')) categoriaProducto = 'mujer';

    if (!categoriaProducto) {
        console.log(`🔎 [ensureHomeSections] Se omite: la categoría "${categoryName}" no se reconoce como Hombre ni Mujer.`);
        return;
    }
    const categoriaOpuesta = categoriaProducto === 'hombre' ? 'mujer' : 'hombre';

    console.log(`🔎 [ensureHomeSections] categoría="${categoriaProducto}" estilo="${styleKey}" tipo="${typeKey}" mostrarEnHome=${!!mostrarEnHome}`);

    try {
        const seccionPropia = await Section.findByCombination(categoriaProducto, styleKey, typeKey);
        if (seccionPropia) {
            console.log(`🔎 [ensureHomeSections] Sección propia ya existía (id=${seccionPropia.id}, visible=${seccionPropia.visible}).`);
            if (!!seccionPropia.visible !== !!mostrarEnHome) {
                await Section.toggleVisible(seccionPropia.id, !!mostrarEnHome);
                console.log(`✅ [ensureHomeSections] Visibilidad de la sección propia actualizada a ${!!mostrarEnHome}.`);
            }
        } else {
            const creada = await Section.create(categoriaProducto, styleKey, typeKey, !!mostrarEnHome);
            console.log(`✅ [ensureHomeSections] Sección propia CREADA (id=${creada.id}, visible=${creada.visible}).`);
        }

        const seccionOpuesta = await Section.findByCombination(categoriaOpuesta, styleKey, typeKey);
        if (!seccionOpuesta) {
            const creadaOpuesta = await Section.create(categoriaOpuesta, styleKey, typeKey, false);
            console.log(`✅ [ensureHomeSections] Sección espejo CREADA oculta (id=${creadaOpuesta.id}).`);
        } else {
            console.log(`🔎 [ensureHomeSections] Sección espejo ya existía (id=${seccionOpuesta.id}).`);
        }
    } catch (error) {
        // No dejamos que un problema al sincronizar secciones tumbe la
        // creación/edición del producto en sí; solo lo registramos.
        console.error('⚠️ [ensureHomeSections] Error al sincronizar secciones de home:', error);
    }
}

exports.getProducts = async (req, res) => {
    const { categoria, estilo, tipo, search } = req.query;

    // Detección de paginación: solo el admin manda ?page o ?limit.
    // Home, catálogo, búsqueda y nav-types NO los mandan → array plano.
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;

    try {
        const baseFilters = { categoria, estilo, tipo, search };

        let products;
        let pagination = null;

        if (wantsPagination) {
            let page = parseInt(req.query.page, 10);
            let limit = parseInt(req.query.limit, 10);
            if (!Number.isInteger(page) || page < 1) page = 1;
            if (!Number.isInteger(limit) || limit < 1) limit = 20;
            if (limit > 100) limit = 100;

            const offset = (page - 1) * limit;

            const [rows, total] = await Promise.all([
                Product.findAll({ ...baseFilters, limit, offset }),
                Product.count(baseFilters)
            ]);

            products = rows;
            pagination = {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1
            };
        } else {
            // Sin paginación explícita: array plano, compatible hacia atrás.
            // El modelo igual aplica su propio límite de seguridad (200).
            products = await Product.findAll(baseFilters);
        }

        // Adjuntar imágenes (mismo comportamiento que antes).
        for (let p of products) {
            const images = await ProductImage.findByProduct(p.id);
            p.imagen = images.length > 0 ? images[0].image_url : null;
            p.images = images.map(img => img.image_url);
        }

        // Con paginación → { data, pagination }; sin → array plano.
        res.json(wantsPagination ? { data: products, pagination } : products);
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

        // Estado actual de "¿se muestra en la página principal?" para esta
        // categoría+estilo+tipo, así el admin ve el checkbox correcto al editar.
        product.mostrado_en_home = false;
        if (product.estilo && product.tipo && product.category_name) {
            const categoriaLower = product.category_name.toLowerCase();
            if (categoriaLower === 'hombre' || categoriaLower === 'mujer') {
                const seccion = await Section.findByCombination(categoriaLower, product.estilo.toLowerCase(), product.tipo.toLowerCase());
                product.mostrado_en_home = seccion ? !!seccion.visible : false;
            }
        }

        res.json(product);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener producto', error);
    }
};

exports.createProduct = async (req, res) => {
    const { name, description, price, stock, category_id, estilo, tipo, image, mostrar_en_home } = req.body;
    console.log('🔎 [createProduct] body recibido:', { name, category_id, estilo, tipo, mostrar_en_home });

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

        const cleanDescription = (description && typeof description === 'string') ? description.trim().slice(0, 500) : '';
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

        // Sincroniza "Gestión de Secciones de Home": crea/ajusta la sección
        // propia según el checkbox del formulario, y crea (oculta) la
        // sección espejo para la otra categoría si todavía no existía.
        const categoriaProducto = await Category.findById(categoryIdNum);
        if (categoriaProducto) {
            await ensureHomeSections(cleanEstilo, cleanTipo, categoriaProducto.name, mostrar_en_home === 'true');
        } else {
            console.log(`🔎 [createProduct] No se encontró la categoría con id=${categoryIdNum}, no se sincronizan secciones.`);
        }

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

    const { name, description, price, stock, category_id, estilo, tipo, image, mostrar_en_home } = req.body;
    console.log('🔎 [updateProduct] body recibido:', { id, name, category_id, estilo, tipo, mostrar_en_home });

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

        const cleanEstilo = (estilo && typeof estilo === 'string') ? estilo.trim().slice(0, 100) : '';
        const cleanTipo = (tipo && typeof tipo === 'string') ? tipo.trim().slice(0, 100) : '';

        const productData = {
            name: name.trim(),
            description: (description && typeof description === 'string') ? description.trim().slice(0, 500) : '',
            price: priceNum,
            stock: stockNum,
            category_id: categoryIdNum,
            estilo: cleanEstilo,
            tipo: cleanTipo
        };

        const product = await Product.update(id, productData);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Misma sincronización que en createProduct: la categoría puede
        // haber cambiado al editar, así que se recalcula con la categoría
        // actual del producto.
        const categoriaProducto = await Category.findById(categoryIdNum);
        if (categoriaProducto) {
            await ensureHomeSections(cleanEstilo, cleanTipo, categoriaProducto.name, mostrar_en_home === 'true');
        } else {
            console.log(`🔎 [updateProduct] No se encontró la categoría con id=${categoryIdNum}, no se sincronizan secciones.`);
        }

        // Igual que en createProduct: si llegan archivos (uno o varios), se
        // suben todos y reemplazan el set de fotos anterior. Si no llega
        // ningún archivo pero sí una URL externa, se mantiene el
        // comportamiento anterior. Si no llega nada, las fotos actuales del
        // producto no se tocan.
        const archivosSubidos = extraerArchivosSubidos(req);

        if (archivosSubidos.length > 0) {
            // Capturar URLs viejas ANTES de borrar las filas.
            const oldImages = await ProductImage.findByProduct(id);

            const imageUrls = await Promise.all(archivosSubidos.map(file => subirImagen(file)));
            await ProductImage.deleteByProduct(id);
            for (let i = 0; i < imageUrls.length; i++) {
                await ProductImage.create(id, imageUrls[i], i === 0);
            }

            // Best-effort: limpiar los archivos viejos.
            await Promise.allSettled(
                oldImages.map(img => {
                    if (!img.image_url) return Promise.resolve();
                    eliminarArchivoLocalSeguro(img.image_url);
                    return eliminarImagen(img.image_url);
                })
            );
        } else if (sanitizedImageUrl) {
            const oldImages = await ProductImage.findByProduct(id);

            await ProductImage.deleteByProduct(id);
            await ProductImage.create(id, sanitizedImageUrl, true);

            await Promise.allSettled(
                oldImages.map(img => {
                    if (!img.image_url) return Promise.resolve();
                    eliminarArchivoLocalSeguro(img.image_url);
                    return eliminarImagen(img.image_url);
                })
            );
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
        // 1. Capturar las URLs de las imágenes ANTES de borrar las filas.
        const images = await ProductImage.findByProduct(id);

        // 2. Borrar de la DB: primero las imágenes, después el producto.
        await ProductImage.deleteByProduct(id);
        const product = await Product.delete(id);
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // 3. Best-effort: limpiar los archivos. Local + Supabase en paralelo.
        await Promise.allSettled(
            images.map(img => {
                if (!img.image_url) return Promise.resolve();
                eliminarArchivoLocalSeguro(img.image_url);
                return eliminarImagen(img.image_url);
            })
        );

        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar producto', error);
    }
};