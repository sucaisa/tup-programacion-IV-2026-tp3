import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('tp3_token') || '');
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem('tp3_usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  // Vistas: 'inicio' (pública), 'login', 'vehiculos', 'conductores', 'viajes'
  const [vista, setVista] = useState('inicio');
  const [modoRegistro, setModoRegistro] = useState(false);

  // Mensajes globales
  const [errorMsg, setErrorMsg] = useState('');
  const [exitoMsg, setExitoMsg] = useState('');

  // Estado formulario Auth
  const [authForm, setAuthForm] = useState({ nombre: '', email: '', password: '' });

  // Datos de las entidades
  const [vehiculos, setVehiculos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [totalKilometros, setTotalKilometros] = useState(0);

  // Formularios y edición
  const [vehiculoForm, setVehiculoForm] = useState({
    id: null,
    marca: '',
    modelo: '',
    patente: '',
    anio: '',
    capacidad_carga: ''
  });

  const [conductorForm, setConductorForm] = useState({
    id: null,
    nombre: '',
    apellido: '',
    dni: '',
    licencia: '',
    fecha_alta_licencia: '',
    fecha_vencimiento_licencia: ''
  });

  const [viajeForm, setViajeForm] = useState({
    id: null,
    vehiculo_id: '',
    conductor_id: '',
    fecha_salida: '',
    fecha_llegada: '',
    origen: '',
    destino: '',
    kilometros: '',
    observaciones: ''
  });

  // Filtros de historial de viajes
  const [filtroVehiculo, setFiltroVehiculo] = useState('');
  const [filtroConductor, setFiltroConductor] = useState('');

  const limpiarMensajes = () => {
    setErrorMsg('');
    setExitoMsg('');
  };

  const cambiarVista = (nuevaVista) => {
    limpiarMensajes();
    setVista(nuevaVista);
  };

  const cerrarSesion = () => {
    localStorage.removeItem('tp3_token');
    localStorage.removeItem('tp3_usuario');
    setToken('');
    setUsuario(null);
    cambiarVista('inicio');
  };

  const cabecerasAuth = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  });

  const procesarErrorApi = (data) => {
    if (data.errores && Array.isArray(data.errores)) {
      return data.errores.map((e) => e.msg).join(' | ');
    }
    return data.error || 'Ocurrió un error en la solicitud';
  };

  // Cargar datos cuando el usuario está autenticado
  const cargarVehiculos = async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/vehiculos`, { headers: cabecerasAuth() });
      if (resp.status === 401 || resp.status === 403) return cerrarSesion();
      const data = await resp.json();
      if (resp.ok) setVehiculos(data);
    } catch {
      setErrorMsg('No se pudo conectar con el servidor');
    }
  };

  const cargarConductores = async () => {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/conductores`, { headers: cabecerasAuth() });
      if (resp.status === 401 || resp.status === 403) return cerrarSesion();
      const data = await resp.json();
      if (resp.ok) setConductores(data);
    } catch {
      setErrorMsg('No se pudo conectar con el servidor');
    }
  };

  const cargarViajes = async (idVehiculo = filtroVehiculo, idConductor = filtroConductor) => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (idVehiculo) params.append('vehiculo_id', idVehiculo);
      if (idConductor) params.append('conductor_id', idConductor);

      const url = `${API_URL}/viajes${params.toString() ? `?${params.toString()}` : ''}`;
      const resp = await fetch(url, { headers: cabecerasAuth() });
      if (resp.status === 401 || resp.status === 403) return cerrarSesion();
      const data = await resp.json();
      if (resp.ok) {
        setViajes(data.viajes || []);
        setTotalKilometros(data.total_kilometros || 0);
      }
    } catch {
      setErrorMsg('No se pudo cargar el historial de viajes');
    }
  };

  useEffect(() => {
    if (token) {
      cargarVehiculos();
      cargarConductores();
      cargarViajes();
    }
  }, [token]);

  // --- AUTENTICACIÓN (LOGIN Y REGISTRO) ---
  const manejarSubmitAuth = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (modoRegistro && authForm.nombre.trim().length < 2) {
      return setErrorMsg('El nombre es obligatorio y debe tener al menos 2 caracteres');
    }
    if (!authForm.email.includes('@')) {
      return setErrorMsg('Ingrese un correo electrónico válido');
    }
    if (authForm.password.length < 6) {
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres');
    }

    try {
      const endpoint = modoRegistro ? '/auth/registro' : '/auth/login';
      const resp = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await resp.json();

      if (!resp.ok) {
        return setErrorMsg(procesarErrorApi(data));
      }

      if (modoRegistro) {
        setExitoMsg('Usuario registrado con éxito. Ahora puedes iniciar sesión.');
        setModoRegistro(false);
        setAuthForm({ nombre: '', email: authForm.email, password: '' });
      } else {
        localStorage.setItem('tp3_token', data.token);
        localStorage.setItem('tp3_usuario', JSON.stringify(data.usuario));
        setToken(data.token);
        setUsuario(data.usuario);
        setAuthForm({ nombre: '', email: '', password: '' });
        cambiarVista('vehiculos');
      }
    } catch {
      setErrorMsg('Error de conexión con el backend');
    }
  };

  // --- CRUD VEHÍCULOS ---
  const guardarVehiculo = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!vehiculoForm.marca.trim() || !vehiculoForm.modelo.trim() || !vehiculoForm.patente.trim()) {
      return setErrorMsg('Marca, modelo y patente son obligatorios');
    }
    if (Number(vehiculoForm.anio) < 1950 || Number(vehiculoForm.anio) > 2027) {
      return setErrorMsg('Ingrese un año válido entre 1950 y 2027');
    }
    if (Number(vehiculoForm.capacidad_carga) <= 0) {
      return setErrorMsg('La capacidad de carga debe ser mayor a 0');
    }

    const esEdicion = Boolean(vehiculoForm.id);
    const url = esEdicion ? `${API_URL}/vehiculos/${vehiculoForm.id}` : `${API_URL}/vehiculos`;
    const metodo = esEdicion ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, {
        method: metodo,
        headers: cabecerasAuth(),
        body: JSON.stringify({
          marca: vehiculoForm.marca,
          modelo: vehiculoForm.modelo,
          patente: vehiculoForm.patente,
          anio: Number(vehiculoForm.anio),
          capacidad_carga: Number(vehiculoForm.capacidad_carga)
        })
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));

      setExitoMsg(esEdicion ? 'Vehículo actualizado correctamente' : 'Vehículo registrado correctamente');
      setVehiculoForm({ id: null, marca: '', modelo: '', patente: '', anio: '', capacidad_carga: '' });
      cargarVehiculos();
    } catch {
      setErrorMsg('Error al guardar el vehículo');
    }
  };

  const eliminarVehiculo = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este vehículo?')) return;
    limpiarMensajes();
    try {
      const resp = await fetch(`${API_URL}/vehiculos/${id}`, {
        method: 'DELETE',
        headers: cabecerasAuth()
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));
      setExitoMsg('Vehículo eliminado');
      cargarVehiculos();
    } catch {
      setErrorMsg('Error al eliminar vehículo');
    }
  };

  // --- CRUD CONDUCTORES ---
  const guardarConductor = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!conductorForm.nombre.trim() || !conductorForm.apellido.trim()) {
      return setErrorMsg('Nombre y apellido del conductor son obligatorios');
    }
    if (!/^[0-9]{7,9}$/.test(conductorForm.dni.trim())) {
      return setErrorMsg('El DNI debe contener entre 7 y 9 números sin puntos');
    }
    if (!conductorForm.licencia.trim()) {
      return setErrorMsg('El número de licencia es obligatorio');
    }
    if (!conductorForm.fecha_alta_licencia || !conductorForm.fecha_vencimiento_licencia) {
      return setErrorMsg('Las fechas de alta y vencimiento de licencia son obligatorias');
    }
    if (new Date(conductorForm.fecha_vencimiento_licencia) <= new Date(conductorForm.fecha_alta_licencia)) {
      return setErrorMsg('La fecha de vencimiento debe ser posterior a la fecha de alta');
    }

    const esEdicion = Boolean(conductorForm.id);
    const url = esEdicion ? `${API_URL}/conductores/${conductorForm.id}` : `${API_URL}/conductores`;
    const metodo = esEdicion ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, {
        method: metodo,
        headers: cabecerasAuth(),
        body: JSON.stringify(conductorForm)
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));

      setExitoMsg(esEdicion ? 'Conductor modificado correctamente' : 'Conductor registrado correctamente');
      setConductorForm({
        id: null,
        nombre: '',
        apellido: '',
        dni: '',
        licencia: '',
        fecha_alta_licencia: '',
        fecha_vencimiento_licencia: ''
      });
      cargarConductores();
    } catch {
      setErrorMsg('Error al guardar el conductor');
    }
  };

  const eliminarConductor = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este conductor?')) return;
    limpiarMensajes();
    try {
      const resp = await fetch(`${API_URL}/conductores/${id}`, {
        method: 'DELETE',
        headers: cabecerasAuth()
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));
      setExitoMsg('Conductor eliminado');
      cargarConductores();
    } catch {
      setErrorMsg('Error al eliminar conductor');
    }
  };

  // --- CRUD Y FILTRO DE VIAJES ---
  const guardarViaje = async (e) => {
    e.preventDefault();
    limpiarMensajes();

    if (!viajeForm.vehiculo_id || !viajeForm.conductor_id) {
      return setErrorMsg('Debe seleccionar un vehículo y un conductor');
    }
    if (!viajeForm.fecha_salida || !viajeForm.fecha_llegada) {
      return setErrorMsg('Debe indicar la fecha de salida y llegada');
    }
    if (new Date(viajeForm.fecha_llegada) < new Date(viajeForm.fecha_salida)) {
      return setErrorMsg('La fecha de llegada no puede ser anterior a la salida');
    }
    if (!viajeForm.origen.trim() || !viajeForm.destino.trim()) {
      return setErrorMsg('El origen y el destino son obligatorios');
    }
    if (Number(viajeForm.kilometros) <= 0) {
      return setErrorMsg('Los kilómetros recorridos deben ser mayores a 0');
    }

    const esEdicion = Boolean(viajeForm.id);
    const url = esEdicion ? `${API_URL}/viajes/${viajeForm.id}` : `${API_URL}/viajes`;
    const metodo = esEdicion ? 'PUT' : 'POST';

    try {
      const resp = await fetch(url, {
        method: metodo,
        headers: cabecerasAuth(),
        body: JSON.stringify({
          vehiculo_id: Number(viajeForm.vehiculo_id),
          conductor_id: Number(viajeForm.conductor_id),
          fecha_salida: viajeForm.fecha_salida,
          fecha_llegada: viajeForm.fecha_llegada,
          origen: viajeForm.origen,
          destino: viajeForm.destino,
          kilometros: Number(viajeForm.kilometros),
          observaciones: viajeForm.observaciones
        })
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));

      setExitoMsg(esEdicion ? 'Viaje actualizado correctamente' : 'Viaje registrado correctamente');
      setViajeForm({
        id: null,
        vehiculo_id: '',
        conductor_id: '',
        fecha_salida: '',
        fecha_llegada: '',
        origen: '',
        destino: '',
        kilometros: '',
        observaciones: ''
      });
      cargarViajes(filtroVehiculo, filtroConductor);
    } catch {
      setErrorMsg('Error al guardar el viaje');
    }
  };

  const eliminarViaje = async (id) => {
    if (!window.confirm('¿Desea eliminar este viaje del registro?')) return;
    limpiarMensajes();
    try {
      const resp = await fetch(`${API_URL}/viajes/${id}`, {
        method: 'DELETE',
        headers: cabecerasAuth()
      });
      const data = await resp.json();
      if (!resp.ok) return setErrorMsg(procesarErrorApi(data));
      setExitoMsg('Viaje eliminado correctamente');
      cargarViajes(filtroVehiculo, filtroConductor);
    } catch {
      setErrorMsg('Error al eliminar viaje');
    }
  };

  const aplicarFiltrosViaje = (nuevoVehiculo, nuevoConductor) => {
    setFiltroVehiculo(nuevoVehiculo);
    setFiltroConductor(nuevoConductor);
    cargarViajes(nuevoVehiculo, nuevoConductor);
  };

  return (
    <div>
      {/* BARRA DE NAVEGACIÓN */}
      <nav className="navbar">
        <div className="navbar-brand">Logística y Transporte UTN</div>
        <div className="navbar-links">
          <button
            className={`nav-btn ${vista === 'inicio' ? 'active' : ''}`}
            onClick={() => cambiarVista('inicio')}
          >
            Inicio Público
          </button>

          {token ? (
            <>
              <button
                className={`nav-btn ${vista === 'vehiculos' ? 'active' : ''}`}
                onClick={() => cambiarVista('vehiculos')}
              >
                Vehículos
              </button>
              <button
                className={`nav-btn ${vista === 'conductores' ? 'active' : ''}`}
                onClick={() => cambiarVista('conductores')}
              >
                Conductores
              </button>
              <button
                className={`nav-btn ${vista === 'viajes' ? 'active' : ''}`}
                onClick={() => cambiarVista('viajes')}
              >
                Viajes e Historial
              </button>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', marginLeft: '6px' }}>
                Hola, {usuario?.nombre}
              </span>
              <button className="nav-btn nav-btn-danger" onClick={cerrarSesion}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <button
              className={`nav-btn ${vista === 'login' ? 'active' : ''}`}
              onClick={() => cambiarVista('login')}
            >
              Iniciar Sesión / Registro
            </button>
          )}
        </div>
      </nav>

      <div className="container">
        {errorMsg && <div className="alert-error">{errorMsg}</div>}
        {exitoMsg && <div className="alert-success">{exitoMsg}</div>}

        {/* 1. PÁGINA PRINCIPAL PÚBLICA */}
        {vista === 'inicio' && (
          <div>
            <div className="hero-card">
              <h1>Sistema Integral de Gestión de Flota, Conductores y Viajes</h1>
              <p>
                Plataforma corporativa para la administración de unidades de transporte, control de
                licencias de conductores y trazabilidad de viajes con cálculo automático de kilometraje.
              </p>
              {!token ? (
                <button className="btn btn-primary" onClick={() => cambiarVista('login')}>
                  Ingresar al Panel Operativo
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => cambiarVista('viajes')}>
                  Ir a Gestión de Viajes
                </button>
              )}
            </div>

            <div className="features-grid">
              <div className="card">
                <h3>Control de Flota</h3>
                <p>
                  Registro detallado de vehículos con marca, modelo, dominio/patente, año de fabricación
                  y capacidad de carga en kilogramos.
                </p>
              </div>
              <div className="card">
                <h3>Legajo de Conductores</h3>
                <p>
                  Seguimiento de documentación, número de licencia habilitante y control estricto de fechas
                  de alta y vencimiento.
                </p>
              </div>
              <div className="card">
                <h3>Historial y Kilometraje</h3>
                <p>
                  Asignación de viajes por unidad y chofer con filtrado dinámico y totalizador automático de
                  kilómetros recorridos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. PÁGINA DE INICIO DE SESIÓN Y REGISTRO */}
        {vista === 'login' && !token && (
          <div className="card auth-box">
            <h2>{modoRegistro ? 'Crear Cuenta de Operador' : 'Iniciar Sesión'}</h2>
            <form onSubmit={manejarSubmitAuth}>
              {modoRegistro && (
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej: Isaías Cabrera"
                    value={authForm.nombre}
                    onChange={(e) => setAuthForm({ ...authForm, nombre: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="operador@transporte.com"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {modoRegistro ? 'Registrarse' : 'Ingresar'}
              </button>
            </form>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="nav-btn"
                style={{ color: '#0284c7', borderColor: 'transparent' }}
                onClick={() => {
                  limpiarMensajes();
                  setModoRegistro(!modoRegistro);
                }}
              >
                {modoRegistro
                  ? '¿Ya tienes cuenta? Inicia sesión aquí'
                  : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>
          </div>
        )}

        {/* 3. PÁGINA DE VEHÍCULOS */}
        {vista === 'vehiculos' && token && (
          <div>
            <div className="card">
              <h2>{vehiculoForm.id ? 'Modificar Vehículo' : 'Alta de Nuevo Vehículo'}</h2>
              <form onSubmit={guardarVehiculo}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Marca *</label>
                    <input
                      type="text"
                      placeholder="Ej: Scania"
                      value={vehiculoForm.marca}
                      onChange={(e) => setVehiculoForm({ ...vehiculoForm, marca: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Modelo *</label>
                    <input
                      type="text"
                      placeholder="Ej: R450"
                      value={vehiculoForm.modelo}
                      onChange={(e) => setVehiculoForm({ ...vehiculoForm, modelo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Patente *</label>
                    <input
                      type="text"
                      placeholder="Ej: AF123CD"
                      value={vehiculoForm.patente}
                      onChange={(e) => setVehiculoForm({ ...vehiculoForm, patente: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Año *</label>
                    <input
                      type="number"
                      placeholder="Ej: 2024"
                      value={vehiculoForm.anio}
                      onChange={(e) => setVehiculoForm({ ...vehiculoForm, anio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Capacidad de Carga (kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 25000"
                      value={vehiculoForm.capacidad_carga}
                      onChange={(e) =>
                        setVehiculoForm({ ...vehiculoForm, capacidad_carga: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  {vehiculoForm.id ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
                {vehiculoForm.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setVehiculoForm({
                        id: null,
                        marca: '',
                        modelo: '',
                        patente: '',
                        anio: '',
                        capacidad_carga: ''
                      })
                    }
                  >
                    Cancelar Edición
                  </button>
                )}
              </form>
            </div>

            <div className="card">
              <h2>Listado de Vehículos</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Patente</th>
                      <th>Año</th>
                      <th>Capacidad (kg)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiculos.length === 0 ? (
                      <tr>
                        <td colSpan="7">No hay vehículos registrados.</td>
                      </tr>
                    ) : (
                      vehiculos.map((v) => (
                        <tr key={v.id}>
                          <td>{v.id}</td>
                          <td>{v.marca}</td>
                          <td>{v.modelo}</td>
                          <td>{v.patente}</td>
                          <td>{v.anio}</td>
                          <td>{v.capacidad_carga} kg</td>
                          <td>
                            <button
                              className="btn btn-edit"
                              onClick={() => setVehiculoForm(v)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-delete"
                              onClick={() => eliminarVehiculo(v.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. PÁGINA DE CONDUCTORES */}
        {vista === 'conductores' && token && (
          <div>
            <div className="card">
              <h2>{conductorForm.id ? 'Modificar Conductor' : 'Alta de Nuevo Conductor'}</h2>
              <form onSubmit={guardarConductor}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      value={conductorForm.nombre}
                      onChange={(e) => setConductorForm({ ...conductorForm, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Apellido *</label>
                    <input
                      type="text"
                      value={conductorForm.apellido}
                      onChange={(e) =>
                        setConductorForm({ ...conductorForm, apellido: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>N.º de Documento (DNI) *</label>
                    <input
                      type="text"
                      placeholder="7 a 9 dígitos"
                      value={conductorForm.dni}
                      onChange={(e) => setConductorForm({ ...conductorForm, dni: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>N.º de Licencia *</label>
                    <input
                      type="text"
                      value={conductorForm.licencia}
                      onChange={(e) =>
                        setConductorForm({ ...conductorForm, licencia: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Alta de Licencia *</label>
                    <input
                      type="date"
                      value={conductorForm.fecha_alta_licencia?.slice(0, 10) || ''}
                      onChange={(e) =>
                        setConductorForm({ ...conductorForm, fecha_alta_licencia: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Vencimiento de Licencia *</label>
                    <input
                      type="date"
                      value={conductorForm.fecha_vencimiento_licencia?.slice(0, 10) || ''}
                      onChange={(e) =>
                        setConductorForm({
                          ...conductorForm,
                          fecha_vencimiento_licencia: e.target.value
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  {conductorForm.id ? 'Guardar Cambios' : 'Registrar Conductor'}
                </button>
                {conductorForm.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setConductorForm({
                        id: null,
                        nombre: '',
                        apellido: '',
                        dni: '',
                        licencia: '',
                        fecha_alta_licencia: '',
                        fecha_vencimiento_licencia: ''
                      })
                    }
                  >
                    Cancelar Edición
                  </button>
                )}
              </form>
            </div>

            <div className="card">
              <h2>Listado de Conductores</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre y Apellido</th>
                      <th>DNI</th>
                      <th>Licencia</th>
                      <th>Alta Licencia</th>
                      <th>Vencimiento</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conductores.length === 0 ? (
                      <tr>
                        <td colSpan="7">No hay conductores registrados.</td>
                      </tr>
                    ) : (
                      conductores.map((c) => (
                        <tr key={c.id}>
                          <td>{c.id}</td>
                          <td>
                            {c.nombre} {c.apellido}
                          </td>
                          <td>{c.dni}</td>
                          <td>{c.licencia}</td>
                          <td>{c.fecha_alta_licencia?.slice(0, 10)}</td>
                          <td>{c.fecha_vencimiento_licencia?.slice(0, 10)}</td>
                          <td>
                            <button
                              className="btn btn-edit"
                              onClick={() => setConductorForm(c)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-delete"
                              onClick={() => eliminarConductor(c.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. PÁGINA DE VIAJES, HISTORIAL Y TOTAL DE KILÓMETROS */}
        {vista === 'viajes' && token && (
          <div>
            <div className="card">
              <h2>{viajeForm.id ? 'Modificar Viaje' : 'Registrar Nuevo Viaje'}</h2>
              <form onSubmit={guardarViaje}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Vehículo *</label>
                    <select
                      value={viajeForm.vehiculo_id}
                      onChange={(e) => setViajeForm({ ...viajeForm, vehiculo_id: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccione Vehículo --</option>
                      {vehiculos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.marca} {v.modelo} ({v.patente})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Conductor *</label>
                    <select
                      value={viajeForm.conductor_id}
                      onChange={(e) => setViajeForm({ ...viajeForm, conductor_id: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccione Conductor --</option>
                      {conductores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.apellido} (DNI: {c.dni})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Fecha y Hora de Salida *</label>
                    <input
                      type="datetime-local"
                      value={viajeForm.fecha_salida ? viajeForm.fecha_salida.replace(' ', 'T').slice(0, 16) : ''}
                      onChange={(e) => setViajeForm({ ...viajeForm, fecha_salida: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Fecha y Hora de Llegada *</label>
                    <input
                      type="datetime-local"
                      value={viajeForm.fecha_llegada ? viajeForm.fecha_llegada.replace(' ', 'T').slice(0, 16) : ''}
                      onChange={(e) => setViajeForm({ ...viajeForm, fecha_llegada: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Origen *</label>
                    <input
                      type="text"
                      placeholder="Ej: La Rioja"
                      value={viajeForm.origen}
                      onChange={(e) => setViajeForm({ ...viajeForm, origen: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Destino *</label>
                    <input
                      type="text"
                      placeholder="Ej: Córdoba"
                      value={viajeForm.destino}
                      onChange={(e) => setViajeForm({ ...viajeForm, destino: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Kilómetros Recorridos *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 430"
                      value={viajeForm.kilometros}
                      onChange={(e) => setViajeForm({ ...viajeForm, kilometros: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Observaciones</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={viajeForm.observaciones || ''}
                      onChange={(e) => setViajeForm({ ...viajeForm, observaciones: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  {viajeForm.id ? 'Guardar Cambios' : 'Registrar Viaje'}
                </button>
                {viajeForm.id && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setViajeForm({
                        id: null,
                        vehiculo_id: '',
                        conductor_id: '',
                        fecha_salida: '',
                        fecha_llegada: '',
                        origen: '',
                        destino: '',
                        kilometros: '',
                        observaciones: ''
                      })
                    }
                  >
                    Cancelar Edición
                  </button>
                )}
              </form>
            </div>

            <div className="card">
              <h2>Consulta de Historial y Cálculo de Kilómetros</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Filtrar por Vehículo</label>
                  <select
                    value={filtroVehiculo}
                    onChange={(e) => aplicarFiltrosViaje(e.target.value, filtroConductor)}
                  >
                    <option value="">Todos los vehículos</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} - {v.patente}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Filtrar por Conductor</label>
                  <select
                    value={filtroConductor}
                    onChange={(e) => aplicarFiltrosViaje(filtroVehiculo, e.target.value)}
                  >
                    <option value="">Todos los conductores</option>
                    {conductores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.apellido} (DNI: {c.dni})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="km-badge">
                Total de Kilómetros Recorridos (según filtro actual): {totalKilometros} km
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Vehículo</th>
                      <th>Conductor</th>
                      <th>Salida</th>
                      <th>Llegada</th>
                      <th>Ruta (Origen → Destino)</th>
                      <th>Kilómetros</th>
                      <th>Observaciones</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viajes.length === 0 ? (
                      <tr>
                        <td colSpan="9">No se encontraron viajes para los filtros seleccionados.</td>
                      </tr>
                    ) : (
                      viajes.map((vi) => (
                        <tr key={vi.id}>
                          <td>{vi.id}</td>
                          <td>
                            {vi.vehiculo_marca} {vi.vehiculo_modelo} ({vi.vehiculo_patente})
                          </td>
                          <td>
                            {vi.conductor_nombre} {vi.conductor_apellido}
                          </td>
                          <td>{vi.fecha_salida?.slice(0, 16).replace('T', ' ')}</td>
                          <td>{vi.fecha_llegada?.slice(0, 16).replace('T', ' ')}</td>
                          <td>
                            {vi.origen} → {vi.destino}
                          </td>
                          <td>{vi.kilometros} km</td>
                          <td>{vi.observaciones || '-'}</td>
                          <td>
                            <button
                              className="btn btn-edit"
                              onClick={() => setViajeForm(vi)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-delete"
                              onClick={() => eliminarViaje(vi.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;