import express from 'express';
import { db } from './db.js';
import { verificarAutenticacion } from './auth.js';
import { validarViaje, validarId, validarFiltrosViaje, verificarValidaciones } from './validaciones.js';

const router = express.Router();

router.use(verificarAutenticacion);

// GET /viajes -> Listar viajes (permite filtrar por ?vehiculo_id=X y/o ?conductor_id=Y y devuelve total_kilometros)
router.get('/', validarFiltrosViaje, verificarValidaciones, async (req, res) => {
  try {
    const { vehiculo_id, conductor_id } = req.query;

    let sql = `
      SELECT 
        v.id,
        v.vehiculo_id,
        ve.marca AS vehiculo_marca,
        ve.modelo AS vehiculo_modelo,
        ve.patente AS vehiculo_patente,
        v.conductor_id,
        c.nombre AS conductor_nombre,
        c.apellido AS conductor_apellido,
        c.dni AS conductor_dni,
        v.fecha_salida,
        v.fecha_llegada,
        v.origen,
        v.destino,
        v.kilometros,
        v.observaciones
      FROM viajes v
      INNER JOIN vehiculos ve ON v.vehiculo_id = ve.id
      INNER JOIN conductores c ON v.conductor_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (vehiculo_id) {
      sql += ' AND v.vehiculo_id = ?';
      params.push(parseInt(vehiculo_id));
    }

    if (conductor_id) {
      sql += ' AND v.conductor_id = ?';
      params.push(parseInt(conductor_id));
    }

    sql += ' ORDER BY v.fecha_salida DESC';

    const [viajes] = await db.query(sql, params);

    const totalKilometros = viajes.reduce(
      (acumulador, viaje) => acumulador + parseFloat(viaje.kilometros),
      0
    );

    return res.status(200).json({
      viajes,
      total_kilometros: Number(totalKilometros.toFixed(2))
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al consultar viajes', detalle: error.message });
  }
});

// GET /viajes/:id -> Obtener un viaje puntual
router.get('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [filas] = await db.query(
      `SELECT 
        v.*,
        ve.marca AS vehiculo_marca,
        ve.modelo AS vehiculo_modelo,
        ve.patente AS vehiculo_patente,
        c.nombre AS conductor_nombre,
        c.apellido AS conductor_apellido
       FROM viajes v
       INNER JOIN vehiculos ve ON v.vehiculo_id = ve.id
       INNER JOIN conductores c ON v.conductor_id = c.id
       WHERE v.id = ?`,
      [id]
    );

    if (filas.length === 0) {
      return res.status(404).json({ error: `Viaje con ID ${id} no encontrado` });
    }

    return res.status(200).json(filas[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener el viaje', detalle: error.message });
  }
});

// POST /viajes -> Registrar nuevo viaje verificando existencia de vehículo y conductor
router.post('/', validarViaje, verificarValidaciones, async (req, res) => {
  try {
    const {
      vehiculo_id,
      conductor_id,
      fecha_salida,
      fecha_llegada,
      origen,
      destino,
      kilometros,
      observaciones
    } = req.body;

    const [vehiculo] = await db.query('SELECT id FROM vehiculos WHERE id = ?', [vehiculo_id]);
    if (vehiculo.length === 0) {
      return res.status(404).json({ error: `El vehículo con ID ${vehiculo_id} no existe` });
    }

    const [conductor] = await db.query('SELECT id FROM conductores WHERE id = ?', [conductor_id]);
    if (conductor.length === 0) {
      return res.status(404).json({ error: `El conductor con ID ${conductor_id} no existe` });
    }

    const [resultado] = await db.query(
      `INSERT INTO viajes 
       (vehiculo_id, conductor_id, fecha_salida, fecha_llegada, origen, destino, kilometros, observaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(vehiculo_id),
        parseInt(conductor_id),
        fecha_salida,
        fecha_llegada,
        origen.trim(),
        destino.trim(),
        parseFloat(kilometros),
        observaciones ? observaciones.trim() : null
      ]
    );

    return res.status(201).json({
      id: resultado.insertId,
      vehiculo_id: parseInt(vehiculo_id),
      conductor_id: parseInt(conductor_id),
      fecha_salida,
      fecha_llegada,
      origen: origen.trim(),
      destino: destino.trim(),
      kilometros: parseFloat(kilometros),
      observaciones: observaciones ? observaciones.trim() : null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar viaje', detalle: error.message });
  }
});

// PUT /viajes/:id -> Modificar viaje existente
router.put('/:id', [...validarId, ...validarViaje], verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehiculo_id,
      conductor_id,
      fecha_salida,
      fecha_llegada,
      origen,
      destino,
      kilometros,
      observaciones
    } = req.body;

    const [existente] = await db.query('SELECT id FROM viajes WHERE id = ?', [id]);
    if (existente.length === 0) {
      return res.status(404).json({ error: `Viaje con ID ${id} no encontrado` });
    }

    const [vehiculo] = await db.query('SELECT id FROM vehiculos WHERE id = ?', [vehiculo_id]);
    if (vehiculo.length === 0) {
      return res.status(404).json({ error: `El vehículo con ID ${vehiculo_id} no existe` });
    }

    const [conductor] = await db.query('SELECT id FROM conductores WHERE id = ?', [conductor_id]);
    if (conductor.length === 0) {
      return res.status(404).json({ error: `El conductor con ID ${conductor_id} no existe` });
    }

    await db.query(
      `UPDATE viajes 
       SET vehiculo_id = ?, conductor_id = ?, fecha_salida = ?, fecha_llegada = ?, origen = ?, destino = ?, kilometros = ?, observaciones = ? 
       WHERE id = ?`,
      [
        parseInt(vehiculo_id),
        parseInt(conductor_id),
        fecha_salida,
        fecha_llegada,
        origen.trim(),
        destino.trim(),
        parseFloat(kilometros),
        observaciones ? observaciones.trim() : null,
        id
      ]
    );

    return res.status(200).json({
      id: parseInt(id),
      vehiculo_id: parseInt(vehiculo_id),
      conductor_id: parseInt(conductor_id),
      fecha_salida,
      fecha_llegada,
      origen: origen.trim(),
      destino: destino.trim(),
      kilometros: parseFloat(kilometros),
      observaciones: observaciones ? observaciones.trim() : null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al actualizar viaje', detalle: error.message });
  }
});

// DELETE /viajes/:id -> Eliminar viaje
router.delete('/:id', validarId, verificarValidaciones, async (req, res) => {
  try {
    const { id } = req.params;
    const [resultado] = await db.query('DELETE FROM viajes WHERE id = ?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: `Viaje con ID ${id} no encontrado` });
    }

    return res.status(200).json({ mensaje: `Viaje con ID ${id} eliminado correctamente` });
  } catch (error) {
    return res.status(500).json({ error: 'Error al eliminar viaje', detalle: error.message });
  }
});

export default router;