import { MockAuthProvider } from '@/contexts/MockAuthContext';
import Dashboard from './Dashboard';

// Componente wrapper que fornece contexto mockado para visualização
const PreviewDashboard = () => {
  return (
    <MockAuthProvider>
      <Dashboard />
    </MockAuthProvider>
  );
};

export default PreviewDashboard;