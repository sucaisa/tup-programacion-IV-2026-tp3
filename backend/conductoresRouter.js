import express from 'express';
import { db } from './db.js';
import { verificarAutenticacion } from './auth.js';
import { validarConductor, validarId, verificarValidaciones } from './validaciones.js';

const router = express.Router();

router.use(verificarAutenticacion);

// GET /conductores -> Listar todos los conductores
router.get('/', async (req, res) => {
  try {
    const [filas] = await db.query('SELECT * FROM conductores ORDER BY id DESC');
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener conductores', detalle: error.message });
  }
});

// GET /conductores/:id -> Obtener un conductor por ID
router.get('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await db.query('SELECT * FROM conductores WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ error: `Conductor con ID ${id} no encontrado` });
    }
    return res.status(200).json(filas[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener conductor', detalle: error.message });
  }
});

// POST /conductores -> Crear conductor
router.post('/', validarConductor, verificarValidaciones, async (req, res) => {
  try {
    const { nombre, apellido, dni, licencia, fecha_alta_licencia, fecha_vencimiento_licencia } = req.body;

    const [duplicado] = await db.query(
      'SELECT id FROM conductores WHERE dni = ? OR UPPER(licencia) = UPPER(?)',
      [dni.trim(), licencia.trim()]
    );
    if (duplicado.length > 0) {
      return res.status(400).json({ error: 'Ya existe un conductor con ese DNI o número de licencia' });
    }

    const [resultado] = await db.query(
      `INSERT INTO conductores 
       (nombre, apellido, dni, licencia, fecha_alta_licencia, fecha_vencimiento_licencia) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), apellido.trim(), dni.trim(), licencia.trim(), fecha_alta_licencia, fecha_vencimiento_licencia]
    );

    return res.status(201).json({
      id: resultado.insertId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      licencia: licencia.trim(),
      fecha_alta_licencia,
      fecha_vencimiento_licencia
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear conductor', detalle: error.message });
  }
});

// PUT /conductores/:id -> Modificar conductor
router.put('/:id', [...validarId, ...validarConductor], verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, dni, licencia, fecha_alta_licencia, fecha_vencimiento_licencia } = req.body;

    const [existente] = await db.query('SELECT id FROM conductores WHERE id = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ error: `Conductor con ID ${id} no encontrado` });
    }

    const [colision] = await db.query(
      'SELECT id FROM conductores WHERE (dni = ? OR UPPER(licencia) = UPPER(?)) AND id != ?',
      [dni.trim(), licencia.trim(), id]
    );
    if (colision.length > 0) {
      return res.status(400).json({ error: 'Otro conductor ya tiene registrado ese DNI o número de licencia' });
    }

    await db.query(
      `UPDATE conductores 
       SET nombre = ?, apellido = ?, dni = ?, licencia = ?, fecha_alta_licencia = ?, fecha_vencimiento_licencia = ? 
       WHERE id = ?`,
      [nombre.trim(), apellido.trim(), dni.trim(), licencia.trim(), fecha_alta_licencia, fecha_vencimiento_licencia, id]
    );

    return res.status(200).json({
      id: parseInt(id),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      licencia: licencia.trim(),
      fecha_alta_licencia,
      fecha_vencimiento_licencia
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar conductor', detalle: error.message });
  }
});

// DELETE /conductores/:id -> Eliminar conductor
router.delete('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [viajesAsociados] = await db.query('SELECT id FROM viajes WHERE conductor_id = ?', [id]);
    if (viajesAsociados.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el conductor porque tiene viajes registrados en el historial'
      });
    }

    const [resultado] = await db.query('DELETE FROM conductores WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: `Conductor con ID ${id} no encontrado` });
    }

    return res.status(200).json({ mensaje: `Conductor con ID ${id} eliminado correctamente` });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar conductor', detalle: error.message });
  }
});

export default router;