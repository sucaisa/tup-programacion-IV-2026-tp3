import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { db } from './db.js';

export const JWT_SECRET = 'clave_secreta_utn_programacion_iv_2026';

const opcionesJwt = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
};

passport.use(
  new JwtStrategy(opcionesJwt, async (payload, done) => {
    try {
      const [usuarios] = await db.query(
        'SELECT id, nombre, email FROM usuarios WHERE id = ?',
        [payload.id]
      );
      if (usuarios.length === 0) {
        return done(null, false);
      }
      return done(null, usuarios[0]);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Middleware que verifica el token y devuelve 401/403 adecuadamente
export const verificarAutenticacion = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No autenticado: Token no proporcionado' });
  }

  passport.authenticate('jwt', { session: false }, (err, usuario, info) => {
    if (err) {
      return res.status(500).json({ error: 'Error al verificar autenticación', detalle: err.message });
    }
    if (!usuario) {
      return res.status(403).json({
        error: 'Acceso denegado: Token inválido o expirado',
        detalle: info ? info.message : undefined
      });
    }
    req.user = usuario;
    next();
  })(req, res, next);
};

export default passport;
