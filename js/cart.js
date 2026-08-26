// ================= LÓGICA DEL CARRITO =================
let cart = [];

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existItem = cart.find(item => item.id === id);

    if (existItem) {
        existItem.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    updateCartUI();
    if (typeof showToast === 'function') showToast();
    if (typeof animateBadge === 'function') animateBadge();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
}

function updateCartUI() {
    // Update Badge Count
    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) badge.textContent = totalItems;

    // Render Sidebar Items
    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';

    let totalPrice = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">Tu bolsa está vacía.</p>';
    } else {
        cart.forEach(item => {
            // Unificamos lectura en inglés y español por seguridad
            const nombreItem = item.name || item.nombre || 'Producto sin nombre';
            const precioItem = parseFloat(item.price || item.precio || 0);
            const imagenItem = item.imagen || item.image_url || 'https://placehold.co/100x100/eeeeee/999999?text=Img';

            totalPrice += (precioItem * item.qty);

            cartItemsContainer.innerHTML += `
                <div class="cart-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                    <img src="${imagenItem}" alt="${nombreItem}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                    <div class="cart-item-info" style="flex-grow: 1;">
                        <h4 class="cart-item-title" style="margin: 0; font-size: 0.95rem; color: #333;">${nombreItem}</h4>
                        <span class="cart-item-price" style="color: #e65c00; font-weight: bold;">$${precioItem.toFixed(2)}</span>
                        <span class="cart-item-qty" style="color: #666; font-size: 0.85rem;">x ${item.qty}</span>
                    </div>
                    <button class="remove-item" onclick="removeFromCart('${item.id}')" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 1.1rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        });
    }

    // Update Total
    const totalPriceElement = document.getElementById('cart-total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;
    }
}

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// ================= FINALIZAR COMPRA POR WHATSAPP =================
function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert('Tu bolsa está vacía. Agrega productos antes de finalizar la compra.');
        return;
    }

    // Tu número de WhatsApp real configurado
    const numeroWhatsApp = "584248995955";

    let mensaje = "Hola! Jr Store 🛍️, quiero realizar el siguiente pedido:\n\n";

    let totalPrice = 0;
    cart.forEach(item => {
        const nombreItem = item.name || item.nombre || 'Producto';
        const precioItem = parseFloat(item.price || item.precio || 0);
        const subtotal = precioItem * item.qty;
        totalPrice += subtotal;

        mensaje += `• ${item.qty}x ${nombreItem} - $${subtotal.toFixed(2)}\n`;
    });

    mensaje += `\n*Total a pagar: $${totalPrice.toFixed(2)}*\n\nQuedo atento para coordinar el pago y el envío. ¡Gracias!`;

    // Codificamos el mensaje para que la URL de WhatsApp lo lea sin errores
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

    // Abrimos WhatsApp en una pestaña nueva
    window.open(urlWhatsApp, '_blank');
}