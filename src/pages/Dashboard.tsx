import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  ChevronRight, 
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { OneSignalDebug } from '@/components/OneSignalDebug';
import { TestNotificationSender } from '@/components/TestNotificationSender';

const Dashboard = () => {
  const { showNotificationBanner, dismissNotificationBanner } = useAuth();
  const navigate = useNavigate();
  const { enablePush, isReady } = useOneSignal();
  const IS_UI_PREVIEW = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/ui-preview') ||
    new URLSearchParams(window.location.search).has('uiPreview')
  );

  const [oneSignalReady, setOneSignalReady] = useState(IS_UI_PREVIEW ? true : false);
  useEffect(() => {
    if (IS_UI_PREVIEW) return;
    let t: any;
    const poll = () => {
      if (isReady()) {
        setOneSignalReady(true);
      } else {
        t = setTimeout(poll, 100);
      }
    };
    poll();
    return () => clearTimeout(t);
  }, [isReady]);
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


const handleNotificationPermission = async () => {
  try {
    console.log('[Dashboard] Iniciando processo de permissão...');
    const subscriptionId = await enablePush();
    console.log('[Dashboard] Subscription ID obtido:', subscriptionId);
    
    // Mostra feedback visual de sucesso
    if (subscriptionId) {
      alert(`Notificações ativadas com sucesso!\nID: ${subscriptionId}`);
    }
  } catch (e: any) {
    // Permissão negada ou erro ao registrar o dispositivo
    console.error('[Dashboard] Falha ao ativar notificações:', e);
    alert(`Erro ao ativar notificações: ${e.message || 'Erro desconhecido'}`);
  } finally {
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
                      disabled={!oneSignalReady}
                      title={!oneSignalReady ? 'Carregando OneSignal...' : undefined}
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

        {/* Central - texto informativo */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <h1 className="text-lg font-semibold text-foreground">
              Esta é sua central de notificações SecretáriaPlus.
            </h1>
            <p className="text-sm text-muted-foreground">
              Com este app instalado, você recebe avisos da IA sobre as conversas automaticamente.
            </p>
            <p className="text-sm text-muted-foreground">
              Basta aceitar as notificações: quando a IA detectar que precisa da sua atenção, você será notificado pelo celular.
            </p>
            <p className="text-sm">
              💡 Dica: Clique na notificação para abrir a conversa diretamente no WhatsApp
            </p>
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
            <Button variant="outline" className="w-full justify-between" onClick={() => window.open('https://web.secretariaplus.com.br', '_blank', 'noopener,noreferrer')}>
              Acessar Sistema
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

{/* Debug Only (desativado no UI Preview) */}
{!IS_UI_PREVIEW && (
  <>
    {/* Debug OneSignal: botão/link oficial fora do banner */}
    <OneSignalDebug />
    {/* Teste de envio de notificação */}
    <TestNotificationSender />
  </>
)}
      </div>

      {!IS_UI_PREVIEW && <BottomNav />}
    </div>
  );
};

export default Dashboard;