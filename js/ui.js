// 1. Iniciar la tienda al cargar la página de forma segura
window.addEventListener('DOMContentLoaded', async () => {
  await fetchProducts(currentFilters);
  renderProducts();
  if (typeof updateCartUI === 'function') {
    updateCartUI();
  }
});

// 2. FUNCIÓN DE RENDERIZADO BLINDADA
function renderProducts() {
  // Buscamos cualquier contenedor posible en tu HTML
  let grid = document.getElementById('product-grid') ||
    document.querySelector('.product-grid') ||
    document.getElementById('catalogo') ||
    document.querySelector('main');

  // Si no existe ningún contenedor en el HTML, lo inyectamos directamente nosotros
  if (!grid) {
    console.warn("⚠️ Creando contenedor de productos de emergencia...");
    const mainContainer = document.createElement('section');
    mainContainer.id = 'product-grid';
    mainContainer.style.cssText = "display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 40px 20px; max-width: 1200px; margin: 0 auto; min-height: 300px;";
    document.body.appendChild(grid = mainContainer);
  }

  // Verificamos si hay productos
  if (!products || products.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666; padding: 40px; font-size: 1.2rem;">No hay productos disponibles para esta búsqueda.</p>';
    return;
  }

  // Limpiamos el contenedor antes de dibujar
  grid.innerHTML = '';

  // Dibujamos cada producto
  products.forEach(producto => {
    const idProd = producto.id || '';
    const nombreProducto = producto.name || producto.nombre || 'Producto sin nombre';
    const precioProducto = producto.price || producto.precio || 0;
    const imagenSrc = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999?text=Sin+Imagen';
    const estiloProducto = producto.estilo || '';

    let idCategoria = producto.category_id || producto.categoria;
    let textoCategoria = 'Sin categoría';
    if (idCategoria == 1) textoCategoria = 'Hombre';
    if (idCategoria == 2) textoCategoria = 'Mujer';

    const cardHTML = `
            <div class="product-card" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; padding-bottom: 15px; text-align: center; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div class="product-image" style="width: 100%; height: 250px; overflow: hidden; background: #f9f9f9;">
                    <img src="${imagenSrc}" alt="${nombreProducto}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="product-info" style="padding: 15px;">
                    <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; font-weight: bold;">
                        ${textoCategoria} ${estiloProducto ? '- ' + estiloProducto : ''}
                    </span>
                    <h3 style="margin: 10px 0; font-size: 1.1rem; color: #333;">${nombreProducto}</h3>
                    <p class="price" style="font-weight: 600; color: #e65c00; font-size: 1.2rem; margin-bottom: 15px;">$${parseFloat(precioProducto).toFixed(2)}</p>
                    
                    <button class="btn-primary" onclick="window.location.href='#'" style="background: #e65c00; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; width: 90%; transition: background 0.3s;">
                        Añadir a la bolsa
                    </button>
                </div>
            </div>
        `;

    grid.innerHTML += cardHTML;
  });

  // Activar la animación de aparición (agrega la clase "show" que tu CSS espera)
  requestAnimationFrame(() => {
    grid.querySelectorAll('.product-card').forEach(card => {
      card.classList.add('show');
    });
  });
}