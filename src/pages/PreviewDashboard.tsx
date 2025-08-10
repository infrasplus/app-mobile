import React from 'react';
import { MockAuthProvider, useMockAuth } from '@/contexts/MockAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronRight, Home, Bell, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '@/assets/logo.svg';

// Header simplificado para preview
const PreviewHeader = () => (
  <header className="bg-background border-b border-border p-4 flex items-center justify-between">
    <img src={logo} alt="SecretáriaPlus — Central de notificações" className="h-7 md:h-8" />
    <span className="text-xs md:text-sm text-muted-foreground">Clínica Demo</span>
  </header>
);

// BottomNav simplificado para preview
const PreviewBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, label: 'Home', path: '/preview' },
    { icon: Bell, label: 'Notificações', path: '/preview' },
    { icon: Settings, label: 'Ajustes', path: '/preview' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3 min-h-16 pt-2.5 pb-10">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full h-full flex flex-col items-center justify-center gap-1.5 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
              aria-pressed={isActive}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Mock do hook useOneSignal para preview
const useMockOneSignal = () => ({
  enablePush: () => Promise.resolve(),
  isReady: true
});

// Versão simplificada do Dashboard para preview
const SimpleDashboard = () => {
  const { showNotificationBanner, dismissNotificationBanner } = useMockAuth();
  const navigate = useNavigate();
  const { enablePush, isReady } = useMockOneSignal();

  const isPushEnabled = true; // Simula notificações habilitadas

  return (
    <div className="min-h-screen bg-background">
      <PreviewHeader />
      <main className="container mx-auto p-4 pb-20">
        {/* Banner de notificações */}
        {showNotificationBanner && !isPushEnabled && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-primary">Ative as notificações push</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Receba alertas importantes do sistema em tempo real
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={dismissNotificationBanner}
                >
                  Dispensar
                </Button>
                <Button size="sm">
                  Ativar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status das notificações */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notificações Push</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Status: <span className={isPushEnabled ? "text-green-600" : "text-orange-600"}>
                    {isPushEnabled ? "Habilitadas" : "Desabilitadas"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPushEnabled 
                    ? "Você receberá notificações importantes" 
                    : "Ative para receber notificações importantes"
                  }
                </p>
              </div>
              {!isPushEnabled && (
                <Button 
                  variant="outline"
                  onClick={() => console.log('Preview mode - notifications would be enabled')}
                >
                  Ativar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards informativos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Sistema Principal
                <ExternalLink className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Acesse o sistema principal para gerenciar sua clínica
              </p>
              <Button asChild>
                <a 
                  href="https://web.secretariaplus.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Abrir sistema
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobre este App</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Este aplicativo permite receber notificações importantes do seu sistema principal
              </p>
              <Button 
                variant="outline"
                onClick={() => navigate('/settings')}
              >
                Configurações
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <PreviewBottomNav />
    </div>
  );
};

// Componente wrapper que fornece contexto mockado para visualização
const PreviewDashboard = () => {
  return (
    <MockAuthProvider>
      <SimpleDashboard />
    </MockAuthProvider>
  );
};

export default PreviewDashboard;