import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  ExternalLink,
  LogOut, 
  ChevronRight
} from 'lucide-react';

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const settingsOptions = [
    {
      icon: Bell,
      title: 'Ajustes de Notificação',
      description: 'Gerencie quais notificações você deseja receber',
      action: () => navigate('/notification-settings'),
      showArrow: true
    },
    {
      icon: ExternalLink,
      title: 'Acessar Sistema',
      description: 'Acesse o sistema completo para editar sua IA, procedimentos, pausar conversas e muito mais.',
      action: () => {},
      showArrow: false
    },
    {
      icon: LogOut,
      title: 'Sair',
      description: 'Fazer logout da conta',
      action: handleLogout,
      showArrow: false,
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Ajustes</h1>
        
        <div className="space-y-3">
          {settingsOptions.map((option, index) => {
            const IconComponent = option.icon;
            
            return (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <button
                    onClick={option.action}
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <IconComponent className={`h-5 w-5 ${option.textColor || 'text-primary'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${option.textColor || 'text-primary'}`}>
                        {option.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    {option.showArrow && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;