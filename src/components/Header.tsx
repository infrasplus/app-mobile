import logo from '@/assets/logo.svg';

export const Header = () => {
  return (
    <header className="bg-background border-b border-border p-4 flex items-center justify-start">
      <img src={logo} alt="SecretáriaPlus — Central de notificações" className="h-7 md:h-8" />
    </header>
  );
};