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

// Listar mensajes con paginación (solo admin)
exports.getContacts = async (req, res) => {
    try {
        // Parsear y validar page/limit. Si no son válidos, usar defaults
        // (tolerante: no rechazamos por un query param mal formado).
        let page = parseInt(req.query.page, 10);
        let limit = parseInt(req.query.limit, 10);

        if (!Number.isInteger(page) || page < 1) page = 1;
        if (!Number.isInteger(limit) || limit < 1) limit = 20;
        if (limit > 100) limit = 100;   // techo duro: nadie pide 10.000 de una

        const offset = (page - 1) * limit;

        // Ambas consultas en paralelo → una sola ida y vuelta a la DB.
        const [contactos, total] = await Promise.all([
            Contact.findAll({ limit, offset }),
            Contact.count()
        ]);

        res.json({
            data: contactos,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
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