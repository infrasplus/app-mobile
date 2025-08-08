import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  ExternalLink, 
  ChevronRight, 
  AlertTriangle,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { showNotificationBanner, dismissNotificationBanner } = useAuth();
  const navigate = useNavigate();

  const notifications = [
    {
      id: 1,
      type: 'emergency',
      title: 'Emergência Médica',
      message: 'URGENTE: Maik • (62) 93434-191 relatou uma emergência médica/complicação',
      time: '1h atrás',
      priority: 'high'
    }
  ];


  const handleNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(() => {
        dismissNotificationBanner();
      });
    } else {
      dismissNotificationBanner();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="p-4 space-y-4">
        {/* Banner de Notificações */}
        {showNotificationBanner && (
          <Card className="bg-accent/10 border-accent">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-primary">🔔 Ative as Notificações</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Para que o sistema funcione corretamente, você precisa ativar as notificações. 
                    Sem elas, você pode perder emergências importantes!
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleNotificationPermission}
                      className="bg-accent hover:bg-accent/90 text-primary"
                      size="sm"
                    >
                      Ativar Agora
                    </Button>
                    <Button 
                      onClick={dismissNotificationBanner}
                      variant="ghost" 
                      size="sm"
                    >
                      Depois
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={dismissNotificationBanner}
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de Avisos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Avisos
              </CardTitle>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {notifications.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.slice(0, 1).map((notification) => (
                  <div key={notification.id} className="relative p-3 border rounded-lg">
                    <div className="absolute left-0 top-0 h-full w-1 bg-destructive/30" aria-hidden="true" />
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="ghost" 
                  className="w-full justify-between"
                  onClick={() => navigate('/notifications')}
                >
                  Ver todas as notificações
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma notificação no momento</p>
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
              Acessar Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-4">
              Acesse o sistema completo para editar sua IA, procedimentos, pausar conversas e muito mais.
            </p>
            <Button variant="outline" className="w-full justify-between">
              Acessar Sistema
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Dashboard;