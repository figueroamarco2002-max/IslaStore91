/**
 * ====================================================================
 * ARCHIVO: products.js
 * DEPENDENCIAS: config.js (API_BASE_URL, escapeHTML, getProductImages)
 * DESCRIPCIÓN: Obtiene productos de la API, los almacena en el arreglo
 *              global `products`, y renderiza las tarjetas del catálogo.
 * SEGURIDAD: Todos los datos dinámicos se escapan con escapeHTML().
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
        const validFilters = {};
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'Todos') {
                validFilters[key] = filters[key];
            }
        }

        const queryParams = new URLSearchParams(validFilters).toString();
        const url = `${API_BASE_URL}/products${queryParams ? '?' + queryParams : ''}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar productos desde el servidor');

        const data = await response.json();
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
// 4. RENDERIZADO DE PRODUCTOS
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
        const idProd = producto.id || '';
        const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
        const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
        const imagenSrc = getProductImages(producto)[0];

        const descRaw = producto.description || producto.descripcion || '';
        const descripcionSegura = escapeHTML(descRaw);

        const tipoRaw = (producto.tipo || '').trim();
        const tipoLabel = tipoRaw
            ? tipoRaw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : 'Producto';
        const tipoSeguro = escapeHTML(tipoLabel);

        let categoriaRaw = producto.category_name || '';
        if (!categoriaRaw) {
            const idCat = producto.category_id || producto.categoria;
            categoriaRaw = idCat == 1 ? 'Hombre' : idCat == 2 ? 'Mujer' : '';
        }
        const categoriaSegura = escapeHTML(categoriaRaw);

        const cardHTML = `
            <div class="product-card" style="border: 1px solid #B6B6B6; border-radius: 12px; overflow: hidden; background: #fff; box-shadow: 0 4px 12px rgba(13,13,13,0.06); display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease;">
                <div class="product-image" style="position: relative; width: 100%; aspect-ratio: 3 / 4; overflow: hidden; background: #E7E7E7; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                    <img src="${imagenSrc}" alt="${nombreSeguro}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">

                    <div style="position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                        <span style="background: #0D0D0D; color: #FFFFFF; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 10px; border-radius: 999px;">
                            ${tipoSeguro}
                        </span>
                        ${categoriaSegura ? `
                        <span style="background: rgba(255,255,255,0.95); color: #0D0D0D; font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(13,13,13,0.08);">
                            ${categoriaSegura}
                        </span>` : ''}
                    </div>
                </div>

                <div class="product-info" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1;">
                    <h3 style="margin: 0; font-size: 1.05rem; color: #0D0D0D; font-weight: 700; line-height: 1.3; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" onclick="openProductDetails('${idProd}')">
                        ${nombreSeguro}
                    </h3>

                    ${descripcionSegura ? `
                    <p style="margin: 0; font-size: 0.85rem; color: #6E6E6E; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${descripcionSegura}
                    </p>` : ''}

                    <div style="margin-top: auto; padding-top: 12px; border-top: 1px solid #EFEFEF; display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-size: 0.7rem; color: #6E6E6E; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Precio</span>
                            <span style="font-size: 1.4rem; color: #0D0D0D; font-weight: 800; line-height: 1;">$${precioSeguro}</span>
                        </div>
                        <button class="product-action-btn" aria-label="Añadir a la bolsa"
    onclick="event.stopPropagation(); addToCart('${idProd}')">
    <i class="fa-solid fa-cart-plus"></i>
</button>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });

    requestAnimationFrame(() => {
        grid.querySelectorAll('.product-card').forEach(card => card.classList.add('show'));
    });
}