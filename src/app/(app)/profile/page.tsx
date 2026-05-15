import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Home, Mail, LogOut } from "lucide-react";

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
    (membership?.homes as unknown as { name: string } | null)?.name ??
    "Sin hogar";

  const name = profile?.name ?? "—";
  const initials = name
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-9 pb-6 space-y-7">
        {/* Header */}
        <h1 className="text-[2rem] font-bold tracking-tight leading-tight">
          Perfil
        </h1>

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-20 w-20 rounded-full bg-foreground text-background flex items-center justify-center text-2xl font-bold tracking-tight select-none">
            {initials}
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg leading-tight">{name}</p>
            <p className="text-muted-foreground text-sm">{homeName}</p>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl border bg-card card-shadow overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Mail size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">
                {profile?.email ?? user.email}
              </p>
            </div>
          </div>
          <div className="h-px bg-border mx-4" />
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Home size={16} className="text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Hogar</p>
              <p className="text-sm font-medium truncate">{homeName}</p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <form action={signOut}>
          <Button
            type="submit"
            variant="outline"
            className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 hover:border-destructive gap-2"
          >
            <LogOut size={15} />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
