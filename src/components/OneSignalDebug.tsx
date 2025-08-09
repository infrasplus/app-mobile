import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OneSignalStatus {
  sdkLoaded: boolean;
  initialized: boolean;
  permission: NotificationPermission | 'unknown';
  subscriptionId: string | null;
  onesignalId: string | null;
  optedIn: boolean;
  token: string | null;
  serviceWorkerActive: boolean;
}

export const OneSignalDebug = () => {
  const [status, setStatus] = useState<OneSignalStatus>({
    sdkLoaded: false,
    initialized: false,
    permission: 'unknown',
    subscriptionId: null,
    onesignalId: null,
    optedIn: false,
    token: null,
    serviceWorkerActive: false,
  });

  const checkStatus = async () => {
    const newStatus: OneSignalStatus = {
      sdkLoaded: !!window.OneSignal,
      initialized: false,
      permission: 'unknown',
      subscriptionId: null,
      onesignalId: null,
      optedIn: false,
      token: null,
      serviceWorkerActive: false,
    };

    // Verifica permissão nativa
    if (typeof Notification !== 'undefined') {
      newStatus.permission = Notification.permission;
    }

    // Verifica Service Worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      newStatus.serviceWorkerActive = !!registration?.active;
    }

    // Verifica OneSignal
    if (window.OneSignal) {
      try {
        // Verifica se está inicializado
        newStatus.initialized = true;

        // Obtém IDs
        if (window.OneSignal.User?.PushSubscription) {
          newStatus.subscriptionId = window.OneSignal.User.PushSubscription.id;
          newStatus.optedIn = window.OneSignal.User.PushSubscription.optedIn || false;
          newStatus.token = window.OneSignal.User.PushSubscription.token || null;
        }

        if (window.OneSignal.User?.onesignalId) {
          newStatus.onesignalId = window.OneSignal.User.onesignalId;
        }

        // Tenta métodos assíncronos se os síncronos falharem
        if (!newStatus.subscriptionId && window.OneSignal.User?.PushSubscription?.getIdAsync) {
          try {
            newStatus.subscriptionId = await window.OneSignal.User.PushSubscription.getIdAsync();
          } catch (e) {
            console.error('Erro ao obter ID async:', e);
          }
        }
      } catch (e) {
        console.error('Erro ao verificar OneSignal:', e);
      }
    }

    setStatus(newStatus);
  };

  // Atualiza status a cada 2 segundos
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const testNotification = async () => {
    if (!window.OneSignal) {
      alert('OneSignal não está carregado');
      return;
    }

    try {
      // Testa permissão
      const permission = await Notification.requestPermission();
      console.log('Permissão:', permission);

      // Testa inscrição
      if (permission === 'granted') {
        await window.OneSignal.User.PushSubscription.optIn();
        console.log('OptIn executado');
        
        // Aguarda um pouco e verifica o ID
        setTimeout(async () => {
          const id = window.OneSignal.User.PushSubscription.id;
          console.log('ID após optIn:', id);
          
          if (id) {
            alert(`Sucesso! ID: ${id}`);
          } else {
            alert('ID ainda não disponível. Verifique o console.');
          }
        }, 3000);
      }
    } catch (e) {
      console.error('Erro no teste:', e);
      alert(`Erro: ${e}`);
    }
  };

  const copyToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert('Copiado!');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">🔧 Debug OneSignal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>SDK Carregado:</span>
            <span className={status.sdkLoaded ? 'text-green-600' : 'text-red-600'}>
              {status.sdkLoaded ? '✅ Sim' : '❌ Não'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Inicializado:</span>
            <span className={status.initialized ? 'text-green-600' : 'text-red-600'}>
              {status.initialized ? '✅ Sim' : '❌ Não'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Permissão:</span>
            <span className={
              status.permission === 'granted' ? 'text-green-600' : 
              status.permission === 'denied' ? 'text-red-600' : 
              'text-yellow-600'
            }>
              {status.permission}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Service Worker:</span>
            <span className={status.serviceWorkerActive ? 'text-green-600' : 'text-red-600'}>
              {status.serviceWorkerActive ? '✅ Ativo' : '❌ Inativo'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Inscrito (OptedIn):</span>
            <span className={status.optedIn ? 'text-green-600' : 'text-red-600'}>
              {status.optedIn ? '✅ Sim' : '❌ Não'}
            </span>
          </div>
        </div>

        <div className="border-t pt-2 space-y-1">
          <div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Subscription ID:</span>
              {status.subscriptionId && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 px-1 text-xs"
                  onClick={() => copyToClipboard(status.subscriptionId)}
                >
                  📋
                </Button>
              )}
            </div>
            <div className="font-mono text-[10px] break-all">
              {status.subscriptionId || 'null'}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">OneSignal ID:</span>
              {status.onesignalId && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 px-1 text-xs"
                  onClick={() => copyToClipboard(status.onesignalId)}
                >
                  📋
                </Button>
              )}
            </div>
            <div className="font-mono text-[10px] break-all">
              {status.onesignalId || 'null'}
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Token:</span>
              {status.token && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-5 px-1 text-xs"
                  onClick={() => copyToClipboard(status.token)}
                >
                  📋
                </Button>
              )}
            </div>
            <div className="font-mono text-[10px] break-all line-clamp-2">
              {status.token || 'null'}
            </div>
          </div>
        </div>

        <div className="border-t pt-2 flex gap-2">
          <Button 
            size="sm" 
            onClick={checkStatus}
            className="text-xs h-7"
          >
            🔄 Atualizar
          </Button>
          <Button 
            size="sm" 
            onClick={testNotification}
            variant="outline"
            className="text-xs h-7"
          >
            🧪 Testar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};