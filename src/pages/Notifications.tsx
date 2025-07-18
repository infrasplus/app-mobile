import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Package,
  UserCheck
} from 'lucide-react';

const Notifications = () => {
  const notifications = [
    {
      id: 1,
      type: 'emergency',
      icon: AlertTriangle,
      title: 'Emergência Médica',
      message: 'URGENTE: Maik • (62) 93434-191 relatou uma emergência médica/complicação. Clique para abrir a conversa.',
      time: '1h atrás',
      priority: 'high',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600'
    },
    {
      id: 2,
      type: 'emergency',
      icon: AlertTriangle,
      title: 'Emergência Médica',
      message: 'URGENTE: Raphael • (62) 93681-828 relatou uma emergência médica/complicação. Clique para abrir a conversa.',
      time: '2h atrás',
      priority: 'high',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600'
    },
    {
      id: 3,
      type: 'supplier',
      icon: Package,
      title: 'Mensagem de Fornecedor',
      message: 'O contato Raphael • (62) 93681-828 possivelmente é um fornecedor oferecendo produtos/serviços. Clique para abrir a conversa.',
      time: '7h atrás',
      priority: 'medium',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600'
    },
    {
      id: 4,
      type: 'complaint',
      icon: MessageSquare,
      title: 'Reclamação/Crítica',
      message: 'Paciente demonstrou insatisfação com o atendimento. Atenção necessária.',
      time: '1 dia atrás',
      priority: 'medium',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600'
    },
    {
      id: 5,
      type: 'refund',
      icon: DollarSign,
      title: 'Solicitação de Reembolso',
      message: 'Paciente está solicitando reembolso do procedimento realizado.',
      time: '2 dias atrás',
      priority: 'medium',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-600'
    },
    {
      id: 6,
      type: 'vip',
      icon: UserCheck,
      title: 'Lead VIP',
      message: 'Lead muito importante detectado. Dar atenção especial ao atendimento.',
      time: '3 dias atrás',
      priority: 'high',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-900',
      iconColor: 'text-purple-600'
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Média</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Baixa</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Notificações</h1>
        
        <div className="space-y-4">
          {notifications.map((notification) => {
            const IconComponent = notification.icon;
            
            return (
              <Card 
                key={notification.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${notification.bgColor} ${notification.borderColor}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <IconComponent className={`h-5 w-5 ${notification.iconColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium ${notification.textColor}`}>
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <p className={`text-sm ${notification.textColor} opacity-90 mb-2`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${notification.textColor} opacity-70`}>
                          {notification.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">Nenhuma notificação</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Todas as notificações aparecerão aqui
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Notifications;