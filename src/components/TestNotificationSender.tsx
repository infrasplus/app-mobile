import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ATENÇÃO: Este componente é apenas para TESTE
// Em produção, o envio de notificações deve ser feito pelo backend
// para não expor a API Key

export const TestNotificationSender = () => {
  const [apiKey, setApiKey] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [title, setTitle] = useState('Teste de Notificação');
  const [message, setMessage] = useState('Esta é uma notificação de teste do SecretáriaPlus');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>('');

  const sendTestNotification = async () => {
    if (!apiKey || !playerId) {
      alert('Preencha a API Key e o Player ID');
      return;
    }

    setSending(true);
    setResult('');

    try {
      // NOTA: Em produção, isso deve ser feito no backend!
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: 'd8e46df0-d54d-459f-b79d-6e0a36bffdb8',
          include_player_ids: [playerId],
          headings: { en: title },
          contents: { en: message },
          url: 'https://web.secretariaplus.com.br',
          // iOS específico
          ios_badgeType: 'Increase',
          ios_badgeCount: 1,
          // Prioridade alta
          priority: 10,
          // Som
          ios_sound: 'default',
          android_sound: 'default',
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Sucesso! ID da notificação: ${data.id}\nRecipientes: ${data.recipients}`);
      } else {
        setResult(`❌ Erro: ${JSON.stringify(data.errors || data)}`);
      }
    } catch (error) {
      setResult(`❌ Erro de rede: ${error}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">🚀 Testar Envio de Notificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
          ⚠️ <strong>ATENÇÃO:</strong> Use apenas para teste! Em produção, notificações devem ser enviadas pelo backend.
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-xs">
            API Key (REST API Key do OneSignal)
          </Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Basic xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="text-xs font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Encontre em: OneSignal Dashboard → Settings → Keys & IDs → REST API Key
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="playerId" className="text-xs">
            Player ID / Subscription ID
          </Label>
          <Input
            id="playerId"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="text-xs font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Copie do componente de Debug acima ou do OneSignal Dashboard
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs">
            Título
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-xs">
            Mensagem
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="text-xs min-h-[60px]"
          />
        </div>

        <Button 
          onClick={sendTestNotification}
          disabled={sending || !apiKey || !playerId}
          className="w-full text-xs h-8"
        >
          {sending ? '📤 Enviando...' : '📨 Enviar Notificação Teste'}
        </Button>

        {result && (
          <div className={`text-xs p-2 rounded font-mono whitespace-pre-wrap ${
            result.startsWith('✅') ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            {result}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground space-y-1 border-t pt-2">
          <p><strong>Instruções:</strong></p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Obtenha a REST API Key no OneSignal Dashboard</li>
            <li>Copie o Subscription ID do componente de Debug</li>
            <li>Preencha título e mensagem</li>
            <li>Clique em Enviar</li>
            <li>A notificação deve aparecer no dispositivo em segundos</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};