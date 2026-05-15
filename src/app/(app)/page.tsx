import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardContent from "./_components/DashboardContent";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const { data: membership } = await supabase
    .from("home_members")
    .select("homes(name)")
    .eq("user_id", user.id)
    .single();

  const homeName =
    (membership?.homes as unknown as { name: string } | null)?.name ?? "Mi hogar";

  return (
    <DashboardContent
      userName={profile?.name ?? ""}
      homeName={homeName}
    />
  );
}
