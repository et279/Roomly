"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

export async function signIn(_: unknown, formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email o contraseña inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Credenciales incorrectas" };
  }

  redirect("/");
}

export async function signUp(_: unknown, formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Datos inválidos. Revisá los campos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { emailConfirmation: true };
  }

  const admin = createAdminClient();

  const { data: member } = await admin
    .from("home_members")
    .select("id")
    .eq("user_id", data.user!.id)
    .single();

  if (member) redirect("/");

  const { data: invite } = await admin
    .from("invitations")
    .select("home_id")
    .eq("email", parsed.data.email)
    .eq("status", "pending")
    .single();

  if (invite) {
    await admin
      .from("home_members")
      .insert({ home_id: invite.home_id, user_id: data.user!.id });
    await admin
      .from("invitations")
      .update({ status: "accepted" })
      .eq("email", parsed.data.email)
      .eq("status", "pending");
    redirect("/");
  }

  redirect("/create-home");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
