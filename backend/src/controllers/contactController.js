const Contact = require('../models/Contact');
const { sendError, isValidId, isValidEmail } = require('../utils/security');

// Recibir mensaje desde el formulario público (sin autenticación)
exports.createContact = async (req, res) => {
    const { nombre, correo, telefono, comentario } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (nombre.trim().length > 150) {
        return res.status(400).json({ error: 'El nombre es demasiado largo' });
    }
    if (!correo || !isValidEmail(correo)) {
        return res.status(400).json({ error: 'Debes ingresar un correo válido' });
    }
    if (!comentario || typeof comentario !== 'string' || comentario.trim() === '') {
        return res.status(400).json({ error: 'El comentario es obligatorio' });
    }
    if (comentario.trim().length > 3000) {
        return res.status(400).json({ error: 'El comentario es demasiado largo' });
    }
    if (telefono && (typeof telefono !== 'string' || telefono.trim().length > 30)) {
        return res.status(400).json({ error: 'El teléfono no es válido' });
    }

    try {
        const contacto = await Contact.create({
            nombre: nombre.trim(),
            correo: correo.trim().toLowerCase(),
            telefono: telefono ? telefono.trim() : null,
            comentario: comentario.trim()
        });
        res.status(201).json({ message: 'Mensaje enviado correctamente', contacto });
    } catch (error) {
        return sendError(res, 500, 'Error al guardar el mensaje', error);
    }
};

// Listar mensajes (solo admin)
exports.getContacts = async (req, res) => {
    try {
        const contactos = await Contact.findAll();
        res.json(contactos);
    } catch (error) {
        return sendError(res, 500, 'Error al obtener mensajes', error);
    }
};

exports.markAsRead = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de mensaje inválido' });

    try {
        const contacto = await Contact.markAsRead(id);
        if (!contacto) return res.status(404).json({ error: 'Mensaje no encontrado' });
        res.json(contacto);
    } catch (error) {
        return sendError(res, 500, 'Error al actualizar mensaje', error);
    }
};

exports.deleteContact = async (req, res) => {
    const id = isValidId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de mensaje inválido' });

    try {
        const contacto = await Contact.delete(id);
        if (!contacto) return res.status(404).json({ error: 'Mensaje no encontrado' });
        res.json({ message: 'Mensaje eliminado' });
    } catch (error) {
        return sendError(res, 500, 'Error al eliminar mensaje', error);
    }
};