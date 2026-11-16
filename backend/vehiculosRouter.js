import express from 'express';
import { db } from './db.js';
import { verificarAutenticacion } from './auth.js';
import { validarVehiculo, validarId, verificarValidaciones } from './validaciones.js';

const router = express.Router();

router.use(verificarAutenticacion);

// GET /vehiculos -> Listar todos los vehículos
router.get('/', async (req, res) => {
  try {
    const [filas] = await db.query('SELECT * FROM vehiculos ORDER BY id DESC');
    return res.status(200).json(filas);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener vehículos', detalle: error.message });
  }
});

// GET /vehiculos/:id -> Obtener un vehículo por ID
router.get('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [id]);
    if (filas.length === 0) {
      return res.status(404).json({ error: `Vehículo con ID ${id} no encontrado` });
    }
    return res.status(200).json(filas[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener vehículo', detalle: error.message });
  }
});

// POST /vehiculos -> Crear vehículo
router.post('/', validarVehiculo, verificarValidaciones, async (req, res) => {
  try {
    const { marca, modelo, patente, anio, capacidad_carga } = req.body;
    const patenteNormalizada = patente.trim().toUpperCase();

    const [duplicado] = await db.query('SELECT id FROM vehiculos WHERE UPPER(patente) = ?', [patenteNormalizada]);
    if (duplicado.length > 0) {
      return res.status(400).json({ error: `Ya existe un vehículo registrado con la patente ${patenteNormalizada}` });
    }

    const [resultado] = await db.query(
      'INSERT INTO vehiculos (marca, modelo, patente, anio, capacidad_carga) VALUES (?, ?, ?, ?, ?)',
      [marca.trim(), modelo.trim(), patenteNormalizada, parseInt(anio), parseFloat(capacidad_carga)]
    );

    return res.status(201).json({
      id: resultado.insertId,
      marca: marca.trim(),
      modelo: modelo.trim(),
      patente: patenteNormalizada,
      anio: parseInt(anio),
      capacidad_carga: parseFloat(capacidad_carga)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al crear vehículo', detalle: error.message });
  }
});

// PUT /vehiculos/:id -> Actualizar vehículo
router.put('/:id', [...validarId, ...validarVehiculo], verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const { marca, modelo, patente, anio, capacidad_carga } = req.body;
    const patenteNormalizada = patente.trim().toUpperCase();

    const [existente] = await db.query('SELECT id FROM vehiculos WHERE id = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ error: `Vehículo con ID ${id} no encontrado` });
    }

    const [colision] = await db.query(
      'SELECT id FROM vehiculos WHERE UPPER(patente) = ? AND id != ?',
      [patenteNormalizada, id]
    );
    if (colision.length > 0) {
      return res.status(400).json({ error: `Otro vehículo ya utiliza la patente ${patenteNormalizada}` });
    }

    await db.query(
      'UPDATE vehiculos SET marca = ?, modelo = ?, patente = ?, anio = ?, capacidad_carga = ? WHERE id = ?',
      [marca.trim(), modelo.trim(), patenteNormalizada, parseInt(anio), parseFloat(capacidad_carga), id]
    );

    return res.status(200).json({
      id: parseInt(id),
      marca: marca.trim(),
      modelo: modelo.trim(),
      patente: patenteNormalizada,
      anio: parseInt(anio),
      capacidad_carga: parseFloat(capacidad_carga)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar vehículo', detalle: error.message });
  }
});

// DELETE /vehiculos/:id -> Eliminar vehículo
router.delete('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [viajesAsociados] = await db.query('SELECT id FROM viajes WHERE vehiculo_id = ?', [id]);
    if (viajesAsociados.length > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar el vehículo porque tiene viajes asociados en el historial'
      });
    }

    const [resultado] = await db.query('DELETE FROM vehiculos WHERE id = ?', [id]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: `Vehículo con ID ${id} no encontrado` });
    }

    return res.status(200).json({ mensaje: `Vehículo con ID ${id} eliminado correctamente` });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar vehículo', detalle: error.message });
  }
});

export default router;