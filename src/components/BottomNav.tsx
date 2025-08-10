import { Home, Bell, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Bell, label: 'Notificações', path: '/notifications' },
    { icon: Settings, label: 'Ajustes', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-3 h-[25vh]">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'bg-accent/30 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
              aria-pressed={isActive}
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