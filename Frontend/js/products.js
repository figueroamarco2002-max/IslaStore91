/**
 * ====================================================================
 * ARCHIVO: products.js
 * DEPENDENCIAS: config.js (API_BASE_URL, escapeHTML)
 * DESCRIPCIÓN: Obtiene productos de la API y los almacena en el arreglo
 *              global `products`. También proporciona la función de
 *              renderizado de tarjetas con seguridad.
 * SEGURIDAD: La función renderProducts() aplica escapeHTML a todos
 *            los datos dinámicos antes de insertarlos en el DOM.
 * ====================================================================
 */

// ====================================================================
// 1. VARIABLE GLOBAL DE PRODUCTOS
// ====================================================================
let products = [];

// ====================================================================
// 2. OBTENER PRODUCTOS DESDE EL BACKEND
// ====================================================================
async function fetchProducts(filters = {}) {
    try {
        // Limpiamos filtros: si el filtro es "Todos", lo ignoramos
        const validFilters = {};
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'Todos') {
                validFilters[key] = filters[key];
            }
        }

        const queryParams = new URLSearchParams(validFilters).toString();
        const url = `${API_BASE_URL}/products${queryParams ? '?' + queryParams : ''}`;

        console.log("📍 Consultando URL:", url);

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar productos desde el servidor');

        const data = await response.json();
        console.log("📦 Productos recibidos de la base de datos:", data);

        products = data;
        return products;
    } catch (error) {
        console.error('❌ Error fetchProducts:', error);
        return [];
    }
}

// ====================================================================
// 3. FUNCIÓN OBSOLETA (mantenida por compatibilidad)
// ====================================================================
function saveProductsToStorage() {
    console.warn('saveProductsToStorage está obsoleto, usar API');
}

// ====================================================================
// 4. RENDERIZADO DE PRODUCTOS (SEGURO)
//    - Aplica escapeHTML a nombre, categoría y descripción.
//    - Precios e IDs son seguros (numéricos), pero también se formatean.
// ====================================================================
function renderProducts() {
    let grid = document.getElementById('product-grid') || document.querySelector('.product-grid');
    if (!grid) return;

    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #3D3D3D; padding: 40px;">No hay productos disponibles.</p>';
        return;
    }

    grid.innerHTML = '';

    products.forEach(producto => {
        // === SANITIZAMOS TODOS LOS DATOS DINÁMICOS ===
        const idProd = producto.id || '';
        const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
        const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
        const imagenSrc = getProductImages(producto)[0];

        let idCategoria = producto.category_id || producto.categoria;
        let textoCategoria = idCategoria == 1 ? 'Hombre' : idCategoria == 2 ? 'Mujer' : 'Sin categoría';
        textoCategoria = escapeHTML(textoCategoria);

        // Construir tarjeta con todos los datos sanitizados
        const cardHTML = `
            <div class="product-card" style="border: 1px solid #B6B6B6; border-radius: 8px; overflow: hidden; padding-bottom: 15px; text-align: center; background: #fff; box-shadow: 0 4px 6px rgba(13,13,13,0.06);">
                <div class="product-image" style="width: 100%; height: 250px; overflow: hidden; background: #E7E7E7; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                    <img src="${imagenSrc}" alt="${nombreSeguro}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="product-info" style="padding: 15px;">
                    <span style="font-size: 0.8rem; color: #3D3D3D; text-transform: uppercase; font-weight: bold;">${textoCategoria}</span>
                    <h3 style="margin: 10px 0; font-size: 1.1rem; color: #0D0D0D; cursor: pointer;" onclick="openProductDetails('${idProd}')">${nombreSeguro}</h3>
                    <p class="price" style="font-weight: 700; color: #E63946; font-size: 1.2rem; margin-bottom: 15px;">$${precioSeguro}</p>
                    
                    <button class="btn-primary" onclick="openProductDetails('${idProd}')" style="background: #0D0D0D; color: #FFFFFF; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; width: 90%; transition: background 0.3s;">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });

    // Activar animación (clase "show" que tu CSS espera)
    requestAnimationFrame(() => {
        grid.querySelectorAll('.product-card').forEach(card => {
            card.classList.add('show');
        });
    });
}

// ====================================================================
// 5. INICIALIZACIÓN: si este script se carga después del DOM,
//    podemos llamar a renderProducts() automáticamente si se desea.
//    Pero normalmente se llama desde index.html o main.js.
// ====================================================================
// Se recomienda no ejecutar renderProducts aquí, sino que la página
// principal lo invoque después de fetchProducts.