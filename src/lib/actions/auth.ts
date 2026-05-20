"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
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
  const { data: authData, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Credenciales incorrectas" };
  }

  const userId = authData.user?.id;
  if (userId) {
    const cookieStore = await cookies();
    const inviteToken = cookieStore.get("roomly_invite")?.value;
    if (inviteToken) {
      const admin = createAdminClient();
      const { data: inviteLink } = await admin
        .from("invite_links")
        .select("home_id, expires_at")
        .eq("token", inviteToken)
        .single();

      if (inviteLink && new Date(inviteLink.expires_at) > new Date()) {
        const { data: existingMember } = await admin
          .from("home_members")
          .select("home_id")
          .eq("user_id", userId)
          .limit(1);

        if (!existingMember || existingMember.length === 0) {
          await admin
            .from("home_members")
            .insert({ home_id: inviteLink.home_id, user_id: userId });
        }
        cookieStore.delete("roomly_invite");
      }
    }
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

  const { data: existingRows } = await admin
    .from("home_members")
    .select("id")
    .eq("user_id", data.user!.id)
    .limit(1);

  if (existingRows && existingRows.length > 0) redirect("/");

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

  // Process invite link cookie (token-based invite, not email-based)
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get("roomly_invite")?.value;
  if (inviteToken) {
    const { data: inviteLink } = await admin
      .from("invite_links")
      .select("home_id, expires_at")
      .eq("token", inviteToken)
      .single();

    if (inviteLink && new Date(inviteLink.expires_at) > new Date()) {
      await admin
        .from("home_members")
        .insert({ home_id: inviteLink.home_id, user_id: data.user!.id });
      cookieStore.delete("roomly_invite");
      redirect("/");
    }
  }

  redirect("/create-home");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(_: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  if (!email || !z.email().safeParse(email).success) {
    return { error: "Email inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/reset-password`,
  });

  if (error) return { error: "Hubo un error. Intentá de nuevo." };
  return { success: true };
}

const resetPasswordSchema = z.object({
  password: z.string().min(6),
  confirm: z.string().min(6),
});

export async function resetPassword(_: unknown, formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) return { error: "La contraseña debe tener al menos 6 caracteres" };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Las contraseñas no coinciden" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { error: "No se pudo actualizar la contraseña. El link puede haber expirado." };
  redirect("/");
}

const updateNameSchema = z.object({
  name: z.string().min(2),
});

export async function updateName(_: unknown, formData: FormData) {
  const parsed = updateNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: "El nombre debe tener al menos 2 caracteres" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name })
    .eq("id", user.id);

  if (error) return { error: "No se pudo actualizar el nombre" };

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/profile");
  return { success: true };
}

const changePasswordSchema = z.object({
  password: z.string().min(6),
  confirm: z.string().min(6),
});

export async function changePassword(_: unknown, formData: FormData) {
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) return { error: "La contraseña debe tener al menos 6 caracteres" };
  if (parsed.data.password !== parsed.data.confirm) return { error: "Las contraseñas no coinciden" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { error: "No se pudo actualizar la contraseña" };
  return { success: true };
}
