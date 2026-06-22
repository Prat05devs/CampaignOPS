"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { hasHydrated, setSession, tokens } = useAuthStore();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "prateek@campaignops.local",
      password: "CampaignOps123"
    }
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
          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          id="email"
          type="email"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          id="password"
          type="password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
