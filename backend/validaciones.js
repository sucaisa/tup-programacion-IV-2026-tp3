import { body, param, query, validationResult } from 'express-validator';

export const verificarValidaciones = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }
  next();
};

export const validarId = [
  param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo')
];

// Validaciones de Autenticación
export const validarRegistro = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ min: 2, max: 100 }),
  body('email').trim().isEmail().withMessage('Debe proporcionar un email válido').normalizeEmail(),
  body('password').isString().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

export const validarLogin = [
  body('email').trim().isEmail().withMessage('Debe proporcionar un email válido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

// Validaciones de Vehículos
export const validarVehiculo = [
  body('marca').trim().notEmpty().withMessage('La marca es obligatoria'),
  body('modelo').trim().notEmpty().withMessage('El modelo es obligatorio'),
  body('patente')
    .trim()
    .notEmpty().withMessage('La patente es obligatoria')
    .isLength({ min: 6, max: 10 }).withMessage('La patente debe tener entre 6 y 10 caracteres'),
  body('anio')
    .isInt({ min: 1950, max: 2027 }).withMessage('El año debe ser un número entero válido entre 1950 y 2027'),
  body('capacidad_carga')
    .isFloat({ gt: 0 }).withMessage('La capacidad de carga debe ser un número mayor a 0')
];

// Validaciones de Conductores
export const validarConductor = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('apellido').trim().notEmpty().withMessage('El apellido es obligatorio'),
  body('dni')
    .trim()
    .notEmpty().withMessage('El número de documento es obligatorio')
    .matches(/^[0-9]{7,9}$/).withMessage('El DNI debe contener entre 7 y 9 dígitos numéricos'),
  body('licencia').trim().notEmpty().withMessage('El número de licencia es obligatorio'),
  body('fecha_alta_licencia')
    .isISO8601().withMessage('La fecha de alta de licencia debe tener formato válido YYYY-MM-DD'),
  body('fecha_vencimiento_licencia')
    .isISO8601().withMessage('La fecha de vencimiento debe tener formato válido YYYY-MM-DD')
    .custom((valor, { req }) => {
      if (new Date(valor) <= new Date(req.body.fecha_alta_licencia)) {
        throw new Error('La fecha de vencimiento debe ser posterior a la fecha de alta');
      }
      return true;
    })
];

// Validaciones de Viajes
export const validarViaje = [
  body('vehiculo_id').isInt({ min: 1 }).withMessage('Debe seleccionar un vehículo válido'),
  body('conductor_id').isInt({ min: 1 }).withMessage('Debe seleccionar un conductor válido'),
  body('fecha_salida').isISO8601().withMessage('La fecha de salida debe tener un formato de fecha/hora válido'),
  body('fecha_llegada')
    .isISO8601().withMessage('La fecha de llegada debe tener un formato de fecha/hora válido')
    .custom((valor, { req }) => {
      if (new Date(valor) < new Date(req.body.fecha_salida)) {
        throw new Error('La fecha de llegada no puede ser anterior a la fecha de salida');
      }
      return true;
    }),
  body('origen').trim().notEmpty().withMessage('El origen es obligatorio'),
  body('destino').trim().notEmpty().withMessage('El destino es obligatorio'),
  body('kilometros').isFloat({ gt: 0 }).withMessage('Los kilómetros deben ser un número mayor a 0'),
  body('observaciones').optional({ nullable: true }).isString().withMessage('Las observaciones deben ser texto')
];

export const validarFiltrosViaje = [
  query('vehiculo_id').optional().isInt({ min: 1 }).withMessage('El filtro vehiculo_id debe ser un entero positivo'),
  query('conductor_id').optional().isInt({ min: 1 }).withMessage('El filtro conductor_id debe ser un entero positivo')
];
