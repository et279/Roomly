import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InviteClient from "./_components/InviteClient";

export default async function InvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberRows } = await supabase
    .from("home_members")
    .select("home_id")
    .eq("user_id", user.id)
    .limit(1);

  if (!memberRows || memberRows.length === 0) redirect("/create-home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <InviteClient />
    </main>
  );
}
