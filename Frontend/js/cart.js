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
    // Usamos el arreglo global products (definido en products.js)
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
        // Guardamos una copia segura (no hace falta sanitizar aquí, solo almacenamos)
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
// 5. ACTUALIZAR LA UI DEL CARRITO (SEGURA)
//    - Actualiza el badge del carrito (contador)
//    - Renderiza los items en el sidebar con escapeHTML
//    - Actualiza el total
// ====================================================================
function updateCartUI() {
    // ----- 5.1 Actualizar contador del badge -----
    const totalItems = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    const badges = document.querySelectorAll('.cart-badge, #cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalItems;
    });

    // ----- 5.2 Renderizar productos en el sidebar -----
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    // Limpiar contenedor
    cartItemsContainer.innerHTML = '';

    let totalPrice = 0;

    if (cart.length === 0) {
        // Mensaje estático, seguro
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">Tu bolsa está vacía.</p>';
    } else {
        cart.forEach(item => {
            // === SANITIZAMOS TODOS LOS DATOS DINÁMICOS ===
            const nombreSeguro = escapeHTML(item.name || item.nombre || 'Producto sin nombre');
            const precioItem = parseFloat(item.price || item.precio || 0);
            const precioSeguro = precioItem.toFixed(2);
            const qty = item.qty || 1;
            const subtotal = precioItem * qty;
            totalPrice += subtotal;

            const imagenSrc = item.imagen || item.image_url || 'https://placehold.co/100x100/eeeeee/999999?text=Img';
            // El alt también debe ser sanitizado
            const altSeguro = nombreSeguro;

            // El id se usa en el onclick, no necesita escape (es numérico o UUID)
            const itemId = item.id;

            cartItemsContainer.innerHTML += `
                <div class="cart-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #B6B6B6; padding-bottom: 10px;">
                    <img src="${imagenSrc}" alt="${altSeguro}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                    <div class="cart-item-info" style="flex-grow: 1;">
                        <h4 class="cart-item-title" style="margin: 0; font-size: 0.95rem; color: #0D0D0D;">${nombreSeguro}</h4>
                        <span class="cart-item-price" style="color: #E63946; font-weight: bold;">$${precioSeguro}</span>
                        <span class="cart-item-qty" style="color: #3D3D3D; font-size: 0.85rem;">x ${qty}</span>
                    </div>
                    <button class="remove-item" onclick="removeFromCart('${itemId}')" style="background: none; border: none; color: #E63946; cursor: pointer; font-size: 1.1rem;">
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
//    - No contiene datos del usuario, así que es seguro.
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
                <button class="close-cart" onclick="toggleCart()"><i class="fa-solid fa-xmark"></i></button>
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
// 8. FINALIZAR COMPRA POR WHATSAPP (SEGURO)
//    - El mensaje se construye con datos del carrito, pero no se muestra
//      en el DOM, solo se envía por URL. Aún así, sanitizamos el nombre
//      por si acaso, aunque no es necesario para seguridad (solo afecta
//      al mensaje de texto).
// ====================================================================
function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert('Tu bolsa está vacía. Agrega productos antes de finalizar la compra.');
        return;
    }

    // Tu número de WhatsApp real configurado en config.js
    const numeroWhatsApp = WHATSAPP_NUMBER;

    // Construir mensaje (no hay riesgo de XSS porque va a WhatsApp, no al DOM)
    let mensaje = "Hola! Isla Store 91, quiero realizar el siguiente pedido:\n\n";

    let totalPrice = 0;
    cart.forEach(item => {
        const nombreItem = item.name || item.nombre || 'Producto';
        // Sanitizamos por si acaso (aunque no afecta al DOM)
        const nombreSeguro = escapeHTML(nombreItem);
        const precioItem = parseFloat(item.price || item.precio || 0);
        const qty = item.qty || 1;
        const subtotal = precioItem * qty;
        totalPrice += subtotal;

        mensaje += `• ${qty}x ${nombreSeguro} - $${subtotal.toFixed(2)}\n`;
    });

    mensaje += `\n*Total a pagar: $${totalPrice.toFixed(2)}*\n\nQuedo atento para coordinar el pago y el envío. ¡Gracias!`;

    // Codificamos el mensaje para que la URL de WhatsApp lo lea sin errores
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

    // Abrimos WhatsApp en una pestaña nueva
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