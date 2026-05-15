export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Roomly</h1>
        <p className="text-muted-foreground text-lg">
          Organiza la convivencia en tu casa compartida
        </p>
        <p className="text-muted-foreground text-sm">Setup completo ✓ — listo para el módulo AUTH</p>
      </div>
    </main>
  );
}
