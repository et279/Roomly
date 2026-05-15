import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .single();

  if (!member) {
    redirect("/create-home");
  }

  return <>{children}</>;
}
