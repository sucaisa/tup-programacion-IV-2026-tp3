import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { JWT_SECRET } from './auth.js';
import { validarRegistro, validarLogin, verificarValidaciones } from './validaciones.js';

const router = express.Router();

// POST /auth/registro -> Registrar nuevo usuario con contraseña encriptada
router.post('/registro', validarRegistro, verificarValidaciones, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const [existente] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El email ya se encuentra registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
      [nombre, email, passwordHash]
    );

    return res.status(201).json({
      id: resultado.insertId,
      nombre,
      email
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error al registrar usuario', detalle: error.message });
  }
});

// POST /auth/login -> Iniciar sesión y emitir JWT válido por 4 horas
router.post('/login', validarLogin, verificarValidaciones, async (req, res) => {
  try {
    const { email, password } = req.body;

    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error en el inicio de sesión', detalle: error.message });
  }
});

export default router;