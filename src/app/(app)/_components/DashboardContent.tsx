"use client";

type Props = {
  userName: string;
  homeName: string;
};

const mockTasks = [
  { id: 1, title: "Comprar papel higiénico", done: false, assignee: "Vos" },
  { id: 2, title: "Limpiar el baño", done: true, assignee: "Otro" },
  { id: 3, title: "Pagar el internet", done: false, assignee: "Todos" },
];

const mockShopping = [
  { id: 1, name: "Leche", qty: 2 },
  { id: 2, name: "Huevos", qty: 12 },
  { id: 3, name: "Detergente", qty: 1 },
];

export default function DashboardContent({ userName, homeName }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Hola, {userName} 👋</h1>
          <p className="text-muted-foreground text-sm">{homeName}</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Tareas pendientes</h2>
          <ul className="space-y-2">
            {mockTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <span className={`h-4 w-4 rounded-full border-2 ${task.done ? "bg-primary border-primary" : "border-muted-foreground"}`} />
                <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </span>
                <span className="text-muted-foreground text-xs">{task.assignee}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-lg">Lista de compras</h2>
          <ul className="space-y-2">
            {mockShopping.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border bg-card p-3"
              >
                <span className="text-sm">{item.name}</span>
                <span className="text-muted-foreground text-xs">x{item.qty}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
