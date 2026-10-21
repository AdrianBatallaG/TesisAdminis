import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FileText, ShieldCheck, Coins, TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  Video,
  X,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../context/AuthContext';

const roleLabels = {
  usuario: 'Feligrés',
  editor: 'Editor',
  admin: 'Administrador',
};

export const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [expandedMenus, setExpandedMenus] = useState({});
  const menuButton = useRef(null);

  const closeSidebar = () => {
    setSidebarOpen(false);
    menuButton.current?.focus();
  };

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const toggleMenu = (menuName) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [

    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view', section: 'Espacio de trabajo' },
    { name: 'Bandeja de tickets', path: '/tickets', icon: BookOpen, roles: ['admin', 'editor'], section: 'Espacio de trabajo' },
    { name: 'Auditoría', path: '/auditoria', icon: FileText, permission: 'audit.view', section: 'Espacio de trabajo' },
    { name: 'Usuarios y roles', path: '/admin/usuarios', icon: ShieldCheck, permission: 'users.view', section: 'Espacio de trabajo' },
    { name: 'Finanzas', path: '/finanzas', icon: Coins, permission: 'finance.view', section: 'Espacio de trabajo' },
    { name: 'Reportes', path: '/reportes', icon: TrendingUp, permission: 'reports.view', section: 'Espacio de trabajo' },
    { name: 'Miembros', path: '/miembros', icon: Users, permission: 'members.view' },
    {
      name: 'Medios',
      path: '/medios',
      icon: Video,
      public: true,
      subItems: [
        { name: 'Videos', path: '/medios/videos', public: true },
        { name: 'Biblia en linea', path: '/medios/biblia', public: true },
        { name: 'Publicaciones', path: '/medios/publicaciones', public: true },
        { name: 'Contenido pastoral', path: '/contenido-pastoral', public: true },
      ],
    },
    {
      name: 'Calendarios',
      path: '/calendarios',
      icon: Calendar,
      public: true,
      subItems: [
        { name: 'Eventos', path: '/calendarios/eventos', public: true },
        { name: 'Visitas pastorales', path: '/calendarios/visitas', public: true },
      ],
    },
    {
      name: 'Horarios',
      path: '/horarios',
      icon: Clock,
      public: true,
      subItems: [
        { name: 'Misas', path: '/horarios/misas', public: true },
        { name: 'Atencion parroquial', path: '/horarios/atencion', public: true },
      ],
    },
    { name: 'Donaciones', path: '/donaciones', icon: HeartHandshake, public: true },
    { name: 'Artículos', path: '/articulos', icon: Package, public: true },
    { name: 'Niños y jóvenes', path: '/ninos-jovenes', icon: Users, public: true },

    { name: 'Solicitar documentos', path: '/solicitudes', icon: BookOpen, permission: 'sacraments.request_certificate' },
  ];

  const canAccessItem = (item) => {
    if (item.public) return true;
    if (!user) return false;
    if (item.path === '/solicitudes' && user.role !== 'usuario') return false;
    if (item.permission) return hasPermission(item.permission);
    if (item.roles) return item.roles.includes(user.role);
    return false;
  };

  const isActivePath = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-gray-50">
      <header className="bg-white border-b border-gray-200 shrink-0 relative z-40">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={sidebarOpen}
              aria-controls="main-navigation"
              className="shrink-0 p-2 rounded-md hover:bg-gray-100 text-sage-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-sage-700"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="flex items-center gap-3">
              <img src="/images/logo.png" alt="Parroquia San Francisco de Asis" className="h-14 w-auto" />
              <div className="hidden md:block">
                <h1 className="text-xl font-serif text-sage-800 leading-tight">San Francisco de Asis</h1>
                <p className="text-xs text-sage-600 tracking-wider">Calderon</p>
              </div>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {user ? (
              <>
                <NotificationBell user={user} />
                <Link to="/mi-cuenta" className="flex items-center gap-2 min-w-0" aria-label="Mi perfil">
                  <span className="w-9 h-9 shrink-0 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-xs font-semibold">{user.name?.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span>
                  <div className="min-w-0 max-w-[9rem] sm:max-w-[14rem]"><p className="text-xs sm:text-sm font-medium truncate">{user.name}</p><p className="text-xs text-sage-600">{roleLabels[user.role] || 'Feligres'}</p></div>
                </Link>
                <button
                  type="button"
                  aria-label="Cerrar sesión"
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">Cerrar sesion</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="flex items-center gap-2 px-2 sm:px-4 py-2 text-sm text-sage-700 hover:bg-sage-50 rounded-md transition-colors font-medium">
                  <LogOut size={18} />
                  <span>Ingresar</span>
                </Link>
                <Link to="/register" className="px-2 sm:px-4 py-2 text-sm bg-sage-700 text-white rounded-md hover:bg-sage-800 transition-all shadow-sm">
                  Registrarse
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {user?.activity_blocked && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-900">
          Tu cuenta tiene bloqueo de actividad. Puedes revisar informacion, pero no realizar cambios hasta que un administrador lo quite.
        </div>
      )}

      <div className="relative flex flex-1 min-h-0 min-w-0">
        {sidebarOpen && (
          <button type="button" aria-label="Cerrar menú de navegación" onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
            className="absolute inset-0 z-20 bg-black/40 lg:hidden" />
        )}
        <aside
          id="main-navigation"
          aria-label="Menú principal"
          aria-hidden={!sidebarOpen}
          {...(!sidebarOpen ? { inert: '' } : {})}
          className={`app-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        >
          <nav aria-label="Navegación principal" className="w-72 max-w-[85vw] p-4 space-y-1">
            {['Espacio de trabajo', 'Gestión parroquial'].map(section => <div key={section}>
              {['admin', 'editor'].includes(user?.role) && menuItems.some(item => (item.section || 'Gestión parroquial') === section && canAccessItem(item)) && <p className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-widest text-gray-500">{section}</p>}
              {menuItems.filter(item => (item.section || 'Gestión parroquial') === section).map((item) => {
              if (!canAccessItem(item)) return null;

              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              const isExpanded = expandedMenus[item.name];
              const hasSubItems = item.subItems && item.subItems.length > 0;

              if (hasSubItems) {
                return (
                  <div key={item.path}>
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.name)}
                      aria-expanded={Boolean(isExpanded)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-md transition-all
                        ${isActive ? 'bg-sage-50 text-sage-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={20} className={isActive ? 'text-sage-700' : 'text-gray-500'} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={16} className="text-sage-600" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-4">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                              isActivePath(subItem.path)
                                ? 'bg-sage-50 text-sage-900 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => { if (window.innerWidth < 1024) closeSidebar(); }}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-md transition-all
                    ${isActive ? 'bg-sage-50 text-sage-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  <Icon size={20} className={isActive ? 'text-sage-700' : 'text-gray-500'} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}</div>)}
          </nav>
        </aside>

        <main className="app-content flex-1 min-w-0 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
};
