import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  BarChart,
  GridIcon,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Redirect to admin login if not authenticated or not administrator
  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    } else if (user.role !== 'administrator') {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: LayoutDashboard, 
      active: location.pathname === '/admin' 
    },
    { 
      name: 'Editor Pagine', 
      href: '/admin/page-editor', 
      icon: FileText, 
      active: location.pathname.startsWith('/admin/page-editor') 
    },
    { 
      name: 'Form Builder', 
      href: '/admin/form-builder', 
      icon: GridIcon, 
      active: location.pathname.startsWith('/admin/form-builder') 
    },
    { 
      name: 'Gestione Piani', 
      href: '/admin/plans', 
      icon: CreditCard, 
      active: location.pathname.startsWith('/admin/plans') 
    },
    { 
      name: 'Reports', 
      href: '/admin/reports', 
      icon: BarChart, 
      active: location.pathname === '/admin/reports' || location.pathname.startsWith('/admin/reports/') 
    },
    { 
      name: 'Utenti', 
      href: '/admin/users', 
      icon: Users, 
      active: location.pathname.startsWith('/admin/users') 
    },
    { 
      name: 'ChatGPT', 
      href: '/admin/chatgpt', 
      icon: MessageSquare, 
      active: location.pathname.startsWith('/admin/chatgpt') 
    },
    { 
      name: 'Impostazioni', 
      href: '/admin/settings', 
      icon: Settings, 
      active: location.pathname.startsWith('/admin/settings') 
    },
  ];

  // No need for conditional rendering here since we're redirecting
  // This simplifies the component

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-[var(--color-primary-300)] text-white">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <Link to="/" className="text-xl font-bold">SimolyAI Admin</Link>
          </div>
          <div className="flex flex-col flex-1">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    item.active
                      ? 'bg-[var(--color-primary-700)] text-white'
                      : 'text-white hover:bg-[var(--color-primary-700)]',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      item.active ? 'text-white' : 'text-white group-hover:text-white',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 p-4 border-t border-[var(--color-primary-700)]">
            <div className="flex items-center">
              <div>
                
                {/* <p className="text-sm font-medium text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-300">
                  Role: {user?.role}
                </p> */}
                <Link
                  to="/admin/login"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      await logout();
                      navigate('/admin/login');
                    } catch (error) {
                      console.error('Error signing out:', error);
                    }
                  }}
                  className="text-xs font-medium text-white hover:text-gray-200"
                >
                  Logout
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[var(--color-primary-300)] text-white w-full">
        <Link to="/" className="text-xl font-bold">SimolyAI</Link>
        <button
          type="button"
          className="text-white hover:text-gray-200 focus:outline-none"
          onClick={() => {
            const menu = document.getElementById('mobile-menu');
            if (menu) {
              menu.classList.toggle('hidden');
            }
          }}
        >
          <span className="sr-only">Open main menu</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div id="mobile-menu" className="md:hidden hidden fixed inset-0 z-50 bg-[var(--color-primary-300)] bg-opacity-90">
        <div className="flex justify-end p-4">
          <button
            type="button"
            className="text-white"
            onClick={() => {
              const menu = document.getElementById('mobile-menu');
              if (menu) {
                menu.classList.toggle('hidden');
              }
            }}
          >
            <span className="sr-only">Close menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="px-4 py-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="flex items-center px-3 py-3 text-base font-medium text-white hover:bg-simoly-purple-dark rounded-md"
              onClick={() => {
                const menu = document.getElementById('mobile-menu');
                if (menu) {
                  menu.classList.toggle('hidden');
                }
              }}
            >
              <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
        <main className="flex-1 p-6" style={{ minHeight: '100vh', overflow: 'visible' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
