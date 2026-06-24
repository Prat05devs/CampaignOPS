"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { login } from "../../lib/auth-api";
import { useAuthStore } from "../../stores/auth-store";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

type LoginInput = z.infer<typeof loginSchema>;

const authInputClass =
  "h-12 w-full rounded-full border border-[#D8D3C2] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const authButtonClass = "h-12 w-full rounded-full bg-[#0F3D28] text-sm font-semibold text-white hover:bg-[#0B2F1F]";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { hasHydrated, setSession, tokens } = useAuthStore();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    if (hasHydrated && tokens?.accessToken) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  async function onSubmit(values: LoginInput) {
    setError(null);

    try {
      const response = await login(values);
      setSession({
        user: response.user,
        organization: response.organization,
        activeOrganizationId: response.activeOrganizationId,
        memberships: response.memberships,
        role: response.role,
        tokens: response.tokens
      });
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to log in.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          className={authInputClass}
          id="email"
          placeholder="Email ID"
          type="email"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Link className="text-xs font-semibold text-campaign-orange underline-offset-4 hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <input
          className={authInputClass}
          id="password"
          placeholder="Password"
          type="password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button className={authButtonClass} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
