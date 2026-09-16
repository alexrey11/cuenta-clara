import { useState, useEffect } from 'react';
import { db } from './db';
import type { Usuario } from './db';
import { ThemeProvider } from './ThemeContext';
import Login from './Login';
import WelcomeScreen from './WelcomeScreen';
import Sidebar from './Sidebar';
import NuevaVenta from './NuevaVenta';
import Dashboard from './Dashboard';
import CierreCaja from './CierreCaja';
import GestionUsuarios from './GestionUsuarios';
import Licencias from './Licencias';
import ActivarLicencia from './ActivarLicencia';
import Categorias from './Categorias';
import ProductosCategoria from './ProductosCategoria';
import Clientes from './Clientes';
import TasasCambio from './TasasCambio';
import Reportes from './Reportes';
import Devoluciones from './Devoluciones';
import Comisiones from './Comisiones';
import MovimientosInventario from './MovimientosInventario';
import Configuracion from './Configuracion';
import HistorialVentas from './HistorialVentas';

function App() {
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [vistaActual, setVistaActual] = useState<string>('venta');
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);
  const [licenciaActiva, setLicenciaActiva] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  useEffect(() => {
    const fechaInstalacion = localStorage.getItem('cuenta-clara-fecha-instalacion');
    const usuariosCount = db.usuarios.count();
    usuariosCount.then(count => {
      if (!fechaInstalacion && count === 0) setPrimeraVez(true);
      else setPrimeraVez(false);
    });
  }, []);

  useEffect(() => {
    if (usuarioActual) {
      const licenciaGuardada = localStorage.getItem('cuenta-clara-licencia');
      const esDev = localStorage.getItem('cuenta-clara-dev');
      const esPermanente = localStorage.getItem('cuenta-clara-licencia-permanente');
      const fechaInstalacion = localStorage.getItem('cuenta-clara-fecha-instalacion');
      const fechaVencimiento = localStorage.getItem('cuenta-clara-fecha-vencimiento');

      if (licenciaGuardada === 'activa' && (esDev === 'true' || esPermanente === 'true')) {
        setLicenciaActiva(true);
      } else if (licenciaGuardada === 'activa' && fechaVencimiento) {
        const ahora = new Date().getTime();
        const vencimiento = new Date(fechaVencimiento).getTime();
        setLicenciaActiva(ahora < vencimiento);
      } else if (fechaInstalacion) {
        const diasTranscurridos = Math.floor((new Date().getTime() - new Date(fechaInstalacion).getTime()) / (1000 * 60 * 60 * 24));
        setLicenciaActiva(diasTranscurridos <= 15);
      } else {
        localStorage.setItem('cuenta-clara-fecha-instalacion', new Date().toISOString());
        setLicenciaActiva(true);
      }
    }
  }, [usuarioActual]);

  const cerrarSesion = () => {
    setUsuarioActual(null);
    setVistaActual('venta');
    setCategoriaSeleccionada(null);
  };

  const toggleSidebar = () => setSidebarAbierto(!sidebarAbierto);

  if (primeraVez === true) {
    return (
      <ThemeProvider>
        <WelcomeScreen
          onComenzarPrueba={() => { setPrimeraVez(false); window.location.reload(); }}
          onActivarLicencia={() => { setPrimeraVez(false); window.location.reload(); }}
        />
      </ThemeProvider>
    );
  }

  if (!usuarioActual) {
    return (
      <ThemeProvider>
        <Login onLogin={(usuario) => {
          setUsuarioActual(usuario);
          setVistaActual(usuario.rol === 'vendedor' ? 'venta' : 'dashboard');
        }} />
      </ThemeProvider>
    );
  }

  if (!licenciaActiva) {
    return (
      <ThemeProvider>
        <ActivarLicencia onActivar={() => setLicenciaActiva(true)} />
      </ThemeProvider>
    );
  }

  const renderVista = () => {
    switch (vistaActual) {
      case 'venta':
        return <NuevaVenta onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} onCerrarSesion={cerrarSesion} />;
      case 'categorias':
        if (categoriaSeleccionada) {
          return <ProductosCategoria categoriaId={categoriaSeleccionada!} onVolver={() => setCategoriaSeleccionada(null)} />;
        }
        return <Categorias onSeleccionarCategoria={(id) => setCategoriaSeleccionada(id)} />;
      case 'dashboard':
        return <Dashboard onVolver={() => setVistaActual('venta')} />;
      case 'cierre':
        return <CierreCaja onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} />;
      case 'usuarios':
        return <GestionUsuarios onVolver={() => setVistaActual('dashboard')} usuarioActual={usuarioActual} />;
      case 'licencias':
        return <Licencias usuarioActual={usuarioActual} />;
      case 'clientes':
        return <Clientes usuarioActual={usuarioActual} />;
      case 'tasas':
        return <TasasCambio usuarioActual={usuarioActual} />;
      case 'reportes':
        return <Reportes usuarioActual={usuarioActual} />;
      case 'devoluciones':
        return <Devoluciones usuarioActual={usuarioActual} />;
      case 'comisiones':
        return <Comisiones usuarioActual={usuarioActual} />;
      case 'movimientos':
        return <MovimientosInventario usuarioActual={usuarioActual} />;
      case 'configuracion':
        return <Configuracion usuarioActual={usuarioActual} />;
      case 'historial':
        return <HistorialVentas usuarioActual={usuarioActual} />;
      default:
        return <Dashboard onVolver={() => setVistaActual('venta')} />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Botón hamburguesa (solo móvil) */}
        <button
          onClick={toggleSidebar}
          className="md:hidden fixed top-4 left-4 z-30 bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Abrir menú"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Sidebar
          usuarioActual={usuarioActual}
          vistaActual={vistaActual}
          onCambiarVista={(vista) => {
            setVistaActual(vista);
            if (vista !== 'categorias') setCategoriaSeleccionada(null);
          }}
          onCerrarSesion={cerrarSesion}
          abierto={sidebarAbierto}
          onToggle={toggleSidebar}
        />

        <div className="md:ml-64 pt-16 md:pt-0">
          {renderVista()}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;