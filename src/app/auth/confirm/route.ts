import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Check for invite link token cookie (shareable link flow)
  const inviteToken = request.cookies.get("roomly_invite")?.value;
  if (inviteToken) {
    const { data: inviteLink } = await supabase
      .from("invite_links")
      .select("home_id, expires_at")
      .eq("token", inviteToken)
      .single();

    if (inviteLink && new Date(inviteLink.expires_at) > new Date()) {
      await supabase
        .from("home_members")
        .insert({ home_id: inviteLink.home_id, user_id: data.user.id });
      const res = NextResponse.redirect(`${origin}/`);
      res.cookies.delete("roomly_invite");
      return res;
    }
  }

  // Check for email-based invitation
  const pendingInvite = await supabase
    .from("invitations")
    .select("home_id")
    .eq("email", data.user.email!)
    .eq("status", "pending")
    .single();

  if (pendingInvite.data) {
    await supabase.from("home_members").insert({
      home_id: pendingInvite.data.home_id,
      user_id: data.user.id,
    });
    await supabase
      .from("invitations")
      .update({ status: "accepted" })
      .eq("email", data.user.email!)
      .eq("status", "pending");
    return NextResponse.redirect(`${origin}/`);
  }

  const { data: member } = await supabase
    .from("home_members")
    .select("id")
    .eq("user_id", data.user.id)
    .single();

  if (member) {
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/create-home`);
}
