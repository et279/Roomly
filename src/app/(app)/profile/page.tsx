import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("home_members")
    .select("homes(name)")
    .eq("user_id", user.id)
    .single();

  const homeName =
    (membership?.homes as unknown as { name: string } | null)?.name ?? "Sin hogar";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">Perfil</h1>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div>
            <p className="text-muted-foreground text-xs">Nombre</p>
            <p className="font-medium">{profile?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p className="font-medium">{profile?.email ?? user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Hogar</p>
            <p className="font-medium">{homeName}</p>
          </div>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full text-destructive border-destructive">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
