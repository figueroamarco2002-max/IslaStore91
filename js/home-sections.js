// ================= SECCIONES DE INICIO (carruseles + banners) =================

// Trae productos filtrados SIN tocar el arreglo global "products" del catálogo con filtros
async function fetchProductsFiltered(filters = {}) {
    try {
        const validFilters = {};
        for (const key in filters) {
            if (filters[key] && filters[key] !== 'Todos') validFilters[key] = filters[key];
        }
        const queryParams = new URLSearchParams(validFilters).toString();
        const url = `http://localhost:3000/api/products${queryParams ? '?' + queryParams : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar productos');
        return await response.json();
    } catch (error) {
        console.error('❌ Error fetchProductsFiltered:', error);
        return [];
    }
}

// Tarjeta con las clases "bonitas" del CSS, pensada para carruseles y grids seccionados
function buildCarouselCardHTML(producto) {
    const idProd = producto.id || '';
    const nombre = producto.name || producto.nombre || 'Producto sin nombre';
    const precio = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagen = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';

    return `
    <div class="product-card show" onclick="openProductDetails('${idProd}')">
        <div class="img-container">
            <img src="${imagen}" alt="${nombre}">
        </div>
        <div class="product-info">
            <h3 class="product-title">${nombre}</h3>
            <p class="product-price">$${precio}</p>
        </div>
    </div>
  `;
}

// Registra estos productos en el arreglo global "products" (sin duplicar) para que openProductDetails() los encuentre
function registerProductsGlobally(productos) {
    if (typeof products === 'undefined') return;
    productos.forEach(p => {
        if (!products.find(existing => existing.id === p.id)) {
            products.push(p);
        }
    });
}

async function initCarousel(containerId, filters) {
    const track = document.getElementById(containerId);
    if (!track) return;

    const productos = await fetchProductsFiltered(filters);
    if (!productos || productos.length === 0) {
        track.innerHTML = '<p style="padding: 1rem; color: #999;">No hay productos disponibles en esta categoría todavía.</p>';
        return;
    }

    registerProductsGlobally(productos);
    track.innerHTML = productos.map(buildCarouselCardHTML).join('');
}

function scrollCarousel(containerId, direction) {
    const track = document.getElementById(containerId);
    if (!track) return;
    track.scrollBy({ left: direction * 260, behavior: 'smooth' });
}

function scrollToMujeres() {
    const section = document.getElementById('mujeres-productos');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Inicializar todas las secciones nuevas al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    // Secciones de Hombres (inicio)
    initCarousel('carousel-gorras', { tipo: 'gorra', categoria: 'Hombre' });
    initCarousel('carousel-urbano', { tipo: 'ropa', estilo: 'Urbano', categoria: 'Hombre' });
    initCarousel('carousel-deportivo', { tipo: 'ropa', estilo: 'Deportivo', categoria: 'Hombre' });
    initCarousel('carousel-relojes', { tipo: 'reloj', categoria: 'Hombre' });

    // Secciones de Mujeres (seccionadas igual que las de hombres)
    initCarousel('carousel-gorras-mujer', { tipo: 'gorra', categoria: 'Mujer' });
    initCarousel('carousel-urbano-mujer', { tipo: 'ropa', estilo: 'Urbano', categoria: 'Mujer' });
    initCarousel('carousel-deportivo-mujer', { tipo: 'ropa', estilo: 'Deportivo', categoria: 'Mujer' });
    initCarousel('carousel-relojes-mujer', { tipo: 'reloj', categoria: 'Mujer' });
});