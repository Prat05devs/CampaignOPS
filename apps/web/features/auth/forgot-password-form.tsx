"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { requestPasswordReset } from "../../lib/auth-api";

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const authInputClass =
  "h-12 w-full rounded-full border border-[#D8D3C2] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const authButtonClass = "h-12 w-full rounded-full bg-[#0F3D28] text-sm font-semibold text-white hover:bg-[#0B2F1F]";

export function ForgotPasswordForm() {
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setDevResetUrl(null);
    setError(null);
    setSuccess(false);

    try {
      const response = await requestPasswordReset(values);
      setSuccess(true);
      setDevResetUrl(response.devResetUrl ?? null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to request password reset.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input className={authInputClass} id="email" placeholder="Email ID" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {success ? (
        <div className="rounded-md border border-[#83A2DB]/30 bg-[#83A2DB]/15 px-3 py-2 text-sm text-[#496AA0]">
          If this email exists, reset instructions are ready.
          {devResetUrl ? (
            <Link className="mt-2 block font-semibold text-[#0F3D28] underline-offset-4 hover:underline" href={devResetUrl}>
              Open local reset link
            </Link>
          ) : null}
        </div>
      ) : null}

      {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button className={authButtonClass} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Preparing reset..." : "Request reset link"}
      </Button>
    </form>
  );
}
