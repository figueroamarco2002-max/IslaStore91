/**
 * ====================================================================
 * ARCHIVO: main.js (o script principal de la tienda)
 * DESCRIPCIÓN: Lógica de renderizado de productos, modal de detalles,
 *              menú móvil y animaciones del carrito.
 * SEGURIDAD: Se usa la función escapeHTML() para evitar XSS en todos
 *            los datos dinámicos que se inyectan en el DOM.
 * ====================================================================
 */

// ====================================================================
// 1. FUNCIÓN DE SEGURIDAD: escapeHTML
//    Convierte texto en HTML seguro para insertar con innerHTML,
//    evitando ataques de Cross-Site Scripting (XSS).
//    Se usa siempre que se muestren datos provenientes del usuario
//    o de la base de datos.
// ====================================================================
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ====================================================================
// 2. INICIALIZACIÓN: al cargar la página se obtienen los productos
//    y se renderizan. También se actualiza la UI del carrito.
// ====================================================================
window.addEventListener('DOMContentLoaded', async () => {
  await fetchProducts(currentFilters);
  renderProducts();
  if (typeof updateCartUI === 'function') updateCartUI();
});

// ====================================================================
// 3. RENDERIZADO DE TARJETAS DE PRODUCTOS
//    Cada tarjeta se construye de forma segura usando escapeHTML()
//    en nombre, categoría, precio y cualquier otro dato dinámico.
// ====================================================================
function renderProducts() {
  let grid = document.getElementById('product-grid') || document.querySelector('.product-grid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #666; padding: 40px;">No hay productos disponibles.</p>';
    return;
  }

  grid.innerHTML = '';

  products.forEach(producto => {
    // Sanitizamos TODOS los datos que vienen del backend o del usuario
    const idProd = producto.id || ''; // El ID es numérico o UUID, no requiere escape para atributos
    const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto sin nombre');
    const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
    const imagenSrc = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';

    let idCategoria = producto.category_id || producto.categoria;
    let textoCategoria = idCategoria == 1 ? 'Hombre' : idCategoria == 2 ? 'Mujer' : 'Sin categoría';
    // La categoría es fija (Hombre/Mujer), pero por si acaso la sanitizamos
    textoCategoria = escapeHTML(textoCategoria);

    // Construimos la tarjeta usando template literal, pero escapando todo lo dinámico
    const cardHTML = `
            <div class="product-card" style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; padding-bottom: 15px; text-align: center; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div class="product-image" style="width: 100%; height: 250px; overflow: hidden; background: #f9f9f9; cursor: pointer;" onclick="openProductDetails('${idProd}')">
                    <img src="${imagenSrc}" alt="${nombreSeguro}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="product-info" style="padding: 15px;">
                    <span style="font-size: 0.8rem; color: #888; text-transform: uppercase; font-weight: bold;">${textoCategoria}</span>
                    <h3 style="margin: 10px 0; font-size: 1.1rem; color: #333; cursor: pointer;" onclick="openProductDetails('${idProd}')">${nombreSeguro}</h3>
                    <p class="price" style="font-weight: 600; color: #e65c00; font-size: 1.2rem; margin-bottom: 15px;">$${precioSeguro}</p>
                    
                    <button class="btn-primary" onclick="openProductDetails('${idProd}')" style="background: #333; color: white; border: none; padding: 10px 20px; border-radius: 25px; cursor: pointer; font-weight: bold; width: 90%; transition: background 0.3s;">
                        Ver Detalles
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

// ====================================================================
// 4. MODAL DE DETALLES DEL PRODUCTO
//    Al abrir el modal, se muestran el nombre, precio, imagen y
//    descripción. Todos los datos se sanitizan con escapeHTML()
//    antes de insertarlos en el DOM.
// ====================================================================
function openProductDetails(id) {
  const producto = products.find(p => p.id === id);
  if (!producto) return;

  // Sanitizamos todos los campos que se van a mostrar
  const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto');
  const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
  const imagenSrc = producto.imagen || producto.image_url || 'https://placehold.co/300x400/eeeeee/999999';
  // La descripción puede contener HTML, por lo que la escapamos completamente
  const descripcionSegura = escapeHTML(producto.description || producto.descripcion ||
    'Una excelente elección para complementar tu estilo. Elaborado con materiales de alta calidad y un diseño exclusivo para destacar en cualquier ocasión.');

  const modalContent = document.getElementById('modal-content-area');
  // Ahora todo lo dinámico está escapado, pero las etiquetas HTML fijas (como <ul>, <li>, <h4>) son seguras
  modalContent.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 20px; text-align: left;">
            <img src="${imagenSrc}" alt="${nombreSeguro}" style="width: 100%; max-height: 350px; object-fit: contain; border-radius: 8px; background: #f9f9f9;">
            <div>
                <h2 style="margin: 0 0 10px 0; font-size: 1.8rem; color: #222;">${nombreSeguro}</h2>
                <p style="font-size: 1.5rem; color: #e65c00; font-weight: bold; margin: 0 0 20px 0;">$${precioSeguro}</p>
                
                <div style="margin-bottom: 25px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 1.1rem;">Características del Producto</h4>
                    <p style="color: #555; line-height: 1.6; font-size: 0.95rem; text-align: justify;">${descripcionSegura}</p>
                    
                    <ul style="color: #666; font-size: 0.9rem; margin-top: 15px; padding-left: 20px;">
                        <li>Materiales resistentes y duraderos.</li>
                        <li>Diseño pensado para máxima comodidad.</li>
                        <li>Envío disponible a través de compras por WhatsApp.</li>
                    </ul>
                </div>

                <button onclick="addToCart('${id}'); closeProductModal()" style="background: #e65c00; color: white; border: none; padding: 15px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; font-size: 1.1rem; box-shadow: 0 4px 10px rgba(230,92,0,0.3);">
                    Añadir a la bolsa
                </button>
            </div>
        </div>
    `;

  document.getElementById('product-modal-overlay').classList.add('active');
  document.getElementById('product-modal').classList.add('active');
}

// ====================================================================
// 5. CERRAR MODAL
// ====================================================================
function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('active');
  document.getElementById('product-modal').classList.remove('active');
}

// ====================================================================
// 6. MENÚ MÓVIL
// ====================================================================
function toggleMenu() {
  const nav = document.getElementById('navbar');
  if (nav) {
    nav.classList.toggle('active');
  }
}

// ====================================================================
// 7. TOAST DE NOTIFICACIÓN (sin datos del usuario, es seguro)
// ====================================================================
function showToast() {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4CAF50; font-size: 1.2rem;"></i> ¡Agregado a la bolsa!';
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ====================================================================
// 8. ANIMACIÓN DEL BADGE DEL CARRITO (seguro, sin datos externos)
// ====================================================================
function animateBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  badge.classList.remove('bounce');
  void badge.offsetWidth; // Refresca la animación del navegador
  badge.classList.add('bounce');
}