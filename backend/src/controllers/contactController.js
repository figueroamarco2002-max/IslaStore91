const Contact = require('../models/Contact');

// Recibir mensaje desde el formulario público (sin autenticación)
exports.createContact = async (req, res) => {
    const { nombre, correo, telefono, comentario } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!correo || typeof correo !== 'string' || !correo.includes('@')) {
        return res.status(400).json({ error: 'Debes ingresar un correo válido' });
    }
    if (!comentario || typeof comentario !== 'string' || comentario.trim() === '') {
        return res.status(400).json({ error: 'El comentario es obligatorio' });
    }

    try {
        const contacto = await Contact.create({
            nombre: nombre.trim(),
            correo: correo.trim(),
            telefono: telefono ? telefono.trim() : null,
            comentario: comentario.trim()
        });
        res.status(201).json({ message: 'Mensaje enviado correctamente', contacto });
    } catch (error) {
        console.error('❌ Error en createContact:', error);
        res.status(500).json({ error: 'Error al guardar el mensaje', detalle: error.message });
    }
};

// Listar mensajes (solo admin)
exports.getContacts = async (req, res) => {
    try {
        const contactos = await Contact.findAll();
        res.json(contactos);
    } catch (error) {
        console.error('❌ Error en getContacts:', error);
        res.status(500).json({ error: 'Error al obtener mensajes', detalle: error.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const contacto = await Contact.markAsRead(req.params.id);
        if (!contacto) return res.status(404).json({ error: 'Mensaje no encontrado' });
        res.json(contacto);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar mensaje', detalle: error.message });
    }
};

exports.deleteContact = async (req, res) => {
    try {
        const contacto = await Contact.delete(req.params.id);
        if (!contacto) return res.status(404).json({ error: 'Mensaje no encontrado' });
        res.json({ message: 'Mensaje eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar mensaje', detalle: error.message });
    }
};