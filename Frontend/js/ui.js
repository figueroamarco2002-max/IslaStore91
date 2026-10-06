/**
 * ====================================================================
 * ARCHIVO: ui.js
 * ====================================================================
 */

window.addEventListener('DOMContentLoaded', async () => {
  const filtros = (typeof currentFilters !== 'undefined') ? currentFilters : {};
  await fetchProducts(filtros);
  renderProducts();
  if (typeof updateCartUI === 'function') updateCartUI();
});

function openProductDetails(id) {
  const producto = products.find(p => p.id === id);
  if (!producto) return;

  const nombreSeguro = escapeHTML(producto.name || producto.nombre || 'Producto');
  const precioSeguro = parseFloat(producto.price || producto.precio || 0).toFixed(2);
  const imagenes = getProductImages(producto);
  const descripcionSegura = escapeHTML(producto.description || producto.descripcion ||
    'Una excelente elección para complementar tu estilo.');

  const tipoRaw = (producto.tipo || '').trim();
  const tipoLabel = tipoRaw
    ? tipoRaw.replace(/_/g, ' ').toUpperCase()
    : 'PRODUCTO';
  const tipoSeguro = escapeHTML(tipoLabel);

  let categoriaRaw = producto.category_name || '';
  if (!categoriaRaw) {
    const idCat = producto.category_id || producto.categoria;
    categoriaRaw = idCat == 1 ? 'Hombre' : idCat == 2 ? 'Mujer' : '';
  }
  const categoriaSegura = escapeHTML(categoriaRaw);

  const stockNum = parseInt(producto.stock, 10);
  const stock = Number.isFinite(stockNum) ? stockNum : 0;
  const agotado = stock <= 0;

  const mostrarAlertaStock = stock > 0 && stock <= 5;
  const alertaStock = mostrarAlertaStock ? `
      <div style="background: rgba(230,57,70,0.08); border: 1px solid rgba(230,57,70,0.25); border-radius: 12px; padding: 12px 16px; display: flex; align-items: flex-start; gap: 10px;">
        <i class="fa-solid fa-fire" style="color: var(--accent-color); font-size: 1rem; margin-top: 2px; flex-shrink: 0;"></i>
        <span style="color: var(--accent-color); font-size: 0.9rem; font-weight: 600; line-height: 1.4;">
          ¡Inventario limitado! Quedan solo ${stock} unidad${stock === 1 ? '' : 'es'} disponibles.
        </span>
      </div>
  ` : '';

  const alertaAgotado = agotado ? `
      <div style="display: flex; justify-content: center; padding: 6px 0;">
        <span class="sold-out-glass">
            Agotado
        </span>
      </div>
  ` : '';

  const miniaturasHTML = imagenes.length > 1
    ? `<div class="modal-thumbs" style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
        ${imagenes.map((img, i) => `
          <img src="${img}" alt="${nombreSeguro} - foto ${i + 1}"
               class="modal-thumb"
               onclick="setModalMainImage(this)"
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${i === 0 ? 'var(--accent-color)' : 'transparent'}; transition: border-color 0.2s;">
        `).join('')}
      </div>`
    : '';

  const modalContent = document.getElementById('modal-content-area');
  modalContent.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 20px; text-align: left;">

      <div>
        <img id="modal-main-image" src="${imagenes[0]}" alt="${nombreSeguro}"
             style="width: 100%; max-height: 400px; object-fit: contain; border-radius: 12px; background: #E7E7E7; display: block;">
        ${miniaturasHTML}
      </div>

      <div style="display: flex; flex-direction: column; gap: 14px;">

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <span style="background: var(--text-main); color: #FFFFFF; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 12px; border-radius: 999px;">
            ${tipoSeguro}
          </span>
          ${categoriaSegura ? `
          <span style="background: transparent; color: var(--text-main); font-size: 0.7rem; font-weight: 600; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border-color);">
            ${categoriaSegura}
          </span>` : ''}
        </div>

        <h2 style="margin: 0; font-size: 1.7rem; color: var(--text-main); font-weight: 800; line-height: 1.2;">
          ${nombreSeguro}
        </h2>

        <p style="margin: 0; font-size: 1.9rem; color: var(--accent-color); font-weight: 800; line-height: 1;">
          $${precioSeguro}
        </p>

        <p style="margin: 0; color: var(--text-muted); line-height: 1.6; font-size: 0.95rem;">
          ${descripcionSegura}
        </p>

        ${alertaStock}
        ${alertaAgotado}
      </div>

      ${!agotado ? `
      <button onclick="addToCart('${id}'); closeProductModal()"
        style="background: var(--text-main); color: #FFFFFF; border: none; padding: 16px; border-radius: 12px; cursor: pointer; font-weight: 700; width: 100%; font-size: 1.05rem; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.2s;"
        onmouseover="this.style.background='var(--accent-color)'"
        onmouseout="this.style.background='var(--text-main)'">
        <i class="fa-solid fa-bag-shopping"></i>
        Añadir a la bolsa
      </button>` : ''}

    </div>
  `;

  document.getElementById('product-modal-overlay').classList.add('active');
  document.getElementById('product-modal').classList.add('active');
}

function setModalMainImage(thumbEl) {
  const mainImg = document.getElementById('modal-main-image');
  if (mainImg) mainImg.src = thumbEl.src;

  document.querySelectorAll('.modal-thumb').forEach(t => {
    t.style.border = '2px solid transparent';
  });
  thumbEl.style.border = '2px solid #E63946';
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('active');
  document.getElementById('product-modal').classList.remove('active');
}

function toggleMenu() {
  const nav = document.getElementById('navbar');
  if (nav) {
    nav.classList.toggle('active');
  }
}

function showToast() {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #28A745; font-size: 1.2rem;"></i> ¡Agregado a la bolsa!';
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function animateBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  badge.classList.remove('bounce');
  void badge.offsetWidth;
  badge.classList.add('bounce');
}