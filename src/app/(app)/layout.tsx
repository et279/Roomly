import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "./_components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .single();

  if (!member) redirect("/create-home");

  return (
    <div
      style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
    >
      {children}
      <BottomNav />
    </div>
  );
}
