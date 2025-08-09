import logo from '@/assets/logo.svg';

export const Header = () => {
  return (
    <header className="bg-background border-b border-border p-4 flex items-center justify-center">
      <img src={logo} alt="SecretáriaPlus — Central de notificações" className="h-8 md:h-10" />
    </header>
  );
};