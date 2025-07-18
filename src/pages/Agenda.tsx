import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Phone } from 'lucide-react';

const Agenda = () => {
  const agendaItems = [
    { 
      id: 1,
      name: 'Dio Brando', 
      time: '1:00 PM - 2:00 PM',
      phone: '(62) 98765-4321',
      procedure: 'Consulta Dermatológica',
      status: 'confirmed'
    },
    { 
      id: 2,
      name: 'Roman Banks', 
      time: '1:00 PM - 2:00 PM',
      phone: '(62) 91234-5678',
      procedure: 'Limpeza de Pele',
      status: 'confirmed'
    },
    { 
      id: 3,
      name: 'Jesse Kudrow', 
      time: '3:00 PM - 4:00 PM',
      phone: '(62) 99876-5432',
      procedure: 'Botox',
      status: 'pending'
    },
    { 
      id: 4,
      name: 'Ana Silva', 
      time: '4:30 PM - 5:30 PM',
      phone: '(62) 97654-3210',
      procedure: 'Preenchimento',
      status: 'confirmed'
    },
    { 
      id: 5,
      name: 'Carlos Santos', 
      time: '6:00 PM - 7:00 PM',
      phone: '(62) 96543-2109',
      procedure: 'Consulta Inicial',
      status: 'pending'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Confirmado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-sm text-muted-foreground">10/08 - Segunda-feira</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {agendaItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-primary">{item.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {item.phone}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{item.time}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Procedimento:</span>
                    <p className="font-medium">{item.procedure}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {agendaItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">Nenhum agendamento</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum agendamento para hoje
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Agenda;