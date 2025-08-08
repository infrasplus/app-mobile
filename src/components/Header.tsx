export const Header = () => {
  return (
    <header className="bg-background border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg">SECRETÁRIA</div>
          <div className="bg-accent px-2 py-1 text-xs font-medium text-primary italic">
            PLUS
          </div>
        </div>
      </div>
    </header>
  );
};