import express from 'express';
import cors from 'cors';
import passport from './auth.js';
import usuariosRouter from './usuariosRouter.js';
import vehiculosRouter from './vehiculosRouter.js';
import conductoresRouter from './conductoresRouter.js';
import viajesRouter from './viajesRouter.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Ruta pública informativa
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Gestión de Transporte TP3 funcionando correctamente' });
});

// Enrutadores
app.use('/auth', usuariosRouter);
app.use('/vehiculos', vehiculosRouter);
app.use('/conductores', conductoresRouter);
app.use('/viajes', viajesRouter);

app.listen(PORT, () => {
  console.log(`Servidor Backend TP3 corriendo en http://localhost:${PORT}`);
});
