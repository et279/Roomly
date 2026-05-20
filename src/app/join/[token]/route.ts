import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { origin } = new URL(request.url);

  const admin = createAdminClient();

  const { data: inviteLink } = await admin
    .from("invite_links")
    .select("home_id, expires_at")
    .eq("token", token)
    .single();

  if (!inviteLink) {
    return NextResponse.redirect(`${origin}/login?error=invalid_invite`);
  }

  if (new Date(inviteLink.expires_at) < new Date()) {
    return NextResponse.redirect(`${origin}/login?error=expired_invite`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Only join if the user doesn't already belong to a home
    const { data: existingMember } = await admin
      .from("home_members")
      .select("home_id")
      .eq("user_id", user.id)
      .limit(1);

    if (!existingMember || existingMember.length === 0) {
      await admin
        .from("home_members")
        .insert({ home_id: inviteLink.home_id, user_id: user.id });
    }
    return NextResponse.redirect(`${origin}/`);
  }

  // Not logged in — save token in cookie and send to register
  const response = NextResponse.redirect(`${origin}/register`);
  response.cookies.set("roomly_invite", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}
