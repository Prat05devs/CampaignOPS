"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { resetPassword } from "../../lib/auth-api";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const authInputClass =
  "h-12 w-full rounded-full border border-[#D8D3C2] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const authButtonClass = "h-12 w-full rounded-full bg-[#0F3D28] text-sm font-semibold text-white hover:bg-[#0B2F1F]";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema)
  });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) {
      setError("Password reset token is missing.");
      return;
    }

    setError(null);
    setSuccess(false);

    try {
      await resetPassword({
        password: values.password,
        token
      });
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1200);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to reset password.");
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Password reset token is missing.
        </p>
        <Link className="text-sm font-semibold text-campaign-orange underline-offset-4 hover:underline" href="/forgot-password">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          New password
        </label>
        <input className={authInputClass} id="password" placeholder="New password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          className={authInputClass}
          id="confirmPassword"
          placeholder="Confirm password"
          type="password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      {success ? (
        <p className="rounded-md border border-[#83A2DB]/30 bg-[#83A2DB]/15 px-3 py-2 text-sm text-[#496AA0]">
          Password updated. Redirecting to sign in...
        </p>
      ) : null}

      {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button className={authButtonClass} disabled={isSubmitting || success} type="submit">
        {isSubmitting ? "Updating password..." : "Update password"}
      </Button>
    </form>
  );
}
