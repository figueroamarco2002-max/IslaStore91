/**
 * ====================================================================
 * ARCHIVO: cart.js
 * DEPENDENCIAS: config.js (API_BASE_URL, escapeHTML, WHATSAPP_NUMBER)
 * DESCRIPCIÓN: Maneja el carrito de compras, almacenamiento local,
 *              actualización de UI, y envío por WhatsApp.
 * SEGURIDAD: Todos los datos dinámicos se sanitizan con escapeHTML()
 *            antes de insertarse en el DOM mediante innerHTML.
 * ====================================================================
 */

// ====================================================================
// 1. VARIABLE GLOBAL DEL CARRITO
// ====================================================================
let cart = [];

// Cargar carrito desde localStorage
try {
    const savedCart = localStorage.getItem('jr_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) {
    console.error('Error al cargar carrito de localStorage:', e);
    cart = [];
}

// ====================================================================
// 2. FUNCIONES DE PERSISTENCIA
// ====================================================================
function saveCart() {
    try {
        localStorage.setItem('jr_cart', JSON.stringify(cart));
    } catch (e) {
        console.error('Error al guardar carrito en localStorage:', e);
    }
}

// ====================================================================
// 3. AÑADIR PRODUCTO AL CARRITO (con validación)
// ====================================================================
function addToCart(id) {
    const productList = typeof products !== 'undefined' ? products : [];
    const product = productList.find(p => p.id === id);
    if (!product) {
        console.warn('Producto no encontrado:', id);
        return;
    }

    const existItem = cart.find(item => item.id === id);

    if (existItem) {
        existItem.qty = (existItem.qty || 1) + 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart();
    updateCartUI();
    if (typeof showToast === 'function') showToast();
    if (typeof animateBadge === 'function') animateBadge();
}

// ====================================================================
// 4. ELIMINAR PRODUCTO DEL CARRITO
// ====================================================================
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

// ====================================================================
// 5. ACTUALIZAR LA UI DEL CARRITO
//    - Badge con contador de items
//    - Lista de items (o estado vacío con CTA)
//    - Total
// ====================================================================
function updateCartUI() {
    // ----- 5.1 Actualizar contador del badge -----
    const totalItems = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.cart-badge, #cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems;
    });

    // ----- 5.2 Renderizar el cuerpo del carrito -----
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';

    let totalPrice = 0;

    // ----- 5.2.A Estado vacío (diseño con ícono + CTA) -----
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="width: 90px; height: 90px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-bag-shopping" style="font-size: 2.2rem; color: var(--text-muted); opacity: 0.5;"></i>
                </div>
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main); font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                    Carrito vacío
                </h3>
                <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem; max-width: 260px; line-height: 1.5;">
                    Explora nuestro catálogo urbano para añadir prendas.
                </p>
                <button onclick="toggleCart()"
                    style="margin-top: 8px; background: var(--accent-color); color: #FFFFFF; border: none; padding: 12px 28px; border-radius: 999px; font-weight: 700; cursor: pointer; letter-spacing: 1px; font-size: 0.85rem; text-transform: uppercase; transition: background 0.2s;"
                    onmouseover="this.style.background='var(--accent-hover)'"
                    onmouseout="this.style.background='var(--accent-color)'">
                    Ver catálogo
                </button>
            </div>
        `;
    } else {
        // ----- 5.2.B Items del carrito -----
        cart.forEach(item => {
            const nombreSeguro = escapeHTML(item.name || item.nombre || 'Producto sin nombre');
            const precioItem = parseFloat(item.price || item.precio || 0);
            const precioSeguro = precioItem.toFixed(2);
            const qty = item.qty || 1;
            const subtotal = precioItem * qty;
            totalPrice += subtotal;

            const imagenSrc = item.imagen || item.image_url || 'https://placehold.co/100x100/eeeeee/999999?text=Img';
            const altSeguro = nombreSeguro;
            const itemId = item.id;

            cartItemsContainer.innerHTML += `
                <div class="cart-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <img src="${imagenSrc}" alt="${altSeguro}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                    <div style="flex-grow: 1; min-width: 0;">
                        <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: var(--text-main); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${nombreSeguro}
                        </h4>
                        <span style="color: var(--accent-color); font-weight: 700; font-size: 0.95rem;">$${precioSeguro}</span>
                        <span style="color: var(--text-muted); font-size: 0.82rem; margin-left: 6px;">× ${qty}</span>
                    </div>
                    <button onclick="removeFromCart('${itemId}')"
                        aria-label="Eliminar producto"
                        style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; padding: 8px; border-radius: 8px; transition: color 0.2s, background 0.2s;"
                        onmouseover="this.style.color='var(--accent-color)'; this.style.background='rgba(230,57,70,0.08)'"
                        onmouseout="this.style.color='var(--text-muted)'; this.style.background='transparent'">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        });
    }

    // ----- 5.3 Actualizar total -----
    const totalPriceElement = document.getElementById('cart-total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
    }
}

// ====================================================================
// 6. GARANTIZAR QUE EL SIDEBAR EXISTA (creación dinámica)
// ====================================================================
function ensureCartSidebar() {
    if (!document.getElementById('cart-sidebar')) {
        const overlay = document.createElement('div');
        overlay.className = 'cart-overlay';
        overlay.id = 'cart-overlay';
        overlay.onclick = toggleCart;

        const sidebar = document.createElement('aside');
        sidebar.className = 'cart-sidebar';
        sidebar.id = 'cart-sidebar';
        sidebar.innerHTML = `
            <div class="cart-header">
                <h2>Tu Bolsa</h2>
                <button class="close-cart" onclick="toggleCart()" aria-label="Cerrar carrito"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="cart-body" id="cart-items"></div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total</span>
                    <span id="cart-total-price">$0.00</span>
                </div>
                <button class="btn-checkout" onclick="checkoutWhatsApp()">Finalizar Compra</button>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(sidebar);
    }
}

// ====================================================================
// 7. ABRIR/CERRAR SIDEBAR
// ====================================================================
function toggleCart() {
    ensureCartSidebar();
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// ====================================================================
// 8. FINALIZAR COMPRA POR WHATSAPP
// ====================================================================
function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert('Tu bolsa está vacía. Agrega productos antes de finalizar la compra.');
        return;
    }

    const numeroWhatsApp = WHATSAPP_NUMBER;

    let mensaje = "Hola! Isla Store 91, quiero realizar el siguiente pedido:\n\n";

    let totalPrice = 0;
    cart.forEach(item => {
        const nombreItem = item.name || item.nombre || 'Producto';
        const nombreSeguro = escapeHTML(nombreItem);
        const precioItem = parseFloat(item.price || item.precio || 0);
        const qty = item.qty || 1;
        const subtotal = precioItem * qty;
        totalPrice += subtotal;

        mensaje += `• ${qty}x ${nombreSeguro} - $${subtotal.toFixed(2)}\n`;
    });

    mensaje += `\n*Total a pagar: $${totalPrice.toFixed(2)}*\n\nQuedo atento para coordinar el pago y el envío. ¡Gracias!`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

    window.open(urlWhatsApp, '_blank');
}

// ====================================================================
// 9. INICIALIZACIÓN AUTOMÁTICA
// ====================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ensureCartSidebar();
        updateCartUI();
    });
} else {
    ensureCartSidebar();
    updateCartUI();
}

// ====================================================================
// 10. SINCRONIZAR ENTRE PESTAÑAS
// ====================================================================
window.addEventListener('storage', (e) => {
    if (e.key === 'jr_cart') {
        try {
            cart = JSON.parse(e.newValue || '[]');
            updateCartUI();
        } catch (err) {
            console.warn('Error al sincronizar carrito:', err);
        }
    }
});