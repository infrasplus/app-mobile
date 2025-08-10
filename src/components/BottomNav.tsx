import { Home, Bell, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
  const IS_UI_PREVIEW = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/ui-preview') ||
    new URLSearchParams(window.location.search).has('uiPreview')
  );

  // Em UI Preview queremos ver a navegação para manter fidelidade visual

  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Bell, label: 'Notificações', path: '/notifications' },
    { icon: Settings, label: 'Ajustes', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary bg-accent/20'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};