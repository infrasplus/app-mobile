import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const NotificationSettings = () => {
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState({
    emergency: true,
    complaint: true,
    refund: true,
    nonExistentProcedure: false,
    priceNegotiation: true,
    offHours: true,
    aggression: true,
    vip: true,
    supplier: false,
  });

  const notificationTypes = [
    {
      key: 'emergency',
      title: 'Emergências Médicas',
      description: 'Quando um paciente relata emergência ou intercorrência médica'
    },
    {
      key: 'complaint',
      title: 'Reclamações e Críticas',
      description: 'Quando pacientes demonstram insatisfação ou fazem críticas'
    },
    {
      key: 'refund',
      title: 'Solicitações de Reembolso',
      description: 'Quando pacientes solicitam devolução do dinheiro'
    },
    {
      key: 'nonExistentProcedure',
      title: 'Procedimentos Inexistentes',
      description: 'Quando pacientes perguntam sobre serviços que não oferecemos'
    },
    {
      key: 'priceNegotiation',
      title: 'Tentativas de Barganha',
      description: 'Quando pacientes tentam negociar preços'
    },
    {
      key: 'offHours',
      title: 'Agendamentos Fora do Horário',
      description: 'Tentativas de marcar consultas fora do horário comercial'
    },
    {
      key: 'aggression',
      title: 'Comportamento Agressivo',
      description: 'Quando detectamos tom ofensivo ou agressivo'
    },
    {
      key: 'vip',
      title: 'Leads VIP',
      description: 'Quando identificamos pacientes importantes ou influentes'
    },
    {
      key: 'supplier',
      title: 'Mensagens de Fornecedores',
      description: 'Quando recebemos ofertas comerciais ou de fornecedores'
    }
  ];

  const handleToggle = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Notificações</h1>
        </div>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Tipos de Alerta da IA</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure quais comportamentos dos pacientes devem gerar notificações automáticas
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <Card key={type.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h3 className="font-medium text-primary">
                      {type.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  </div>
                  <Switch
                    checked={notifications[type.key as keyof typeof notifications]}
                    onCheckedChange={() => handleToggle(type.key)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Dica:</strong> Recomendamos manter ativadas as notificações de emergência 
              e comportamentos agressivos para garantir um atendimento adequado.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationSettings;