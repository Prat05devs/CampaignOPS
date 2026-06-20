"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { signup } from "../../lib/auth-api";
import { useAuthStore } from "../../stores/auth-store";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2),
  phone: z.string().optional()
});

type SignupInput = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { hasHydrated, setSession, tokens } = useAuthStore();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
      phone: ""
    }
  });

  useEffect(() => {
    if (hasHydrated && tokens?.accessToken) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  async function onSubmit(values: SignupInput) {
    setError(null);

    try {
      const response = await signup({
        ...values,
        phone: values.phone || undefined
      });
      setSession({
        user: response.user,
        organization: response.organization,
        activeOrganizationId: response.organization.id,
        role: "ADMIN",
        tokens: response.tokens
      });
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create account.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
            id="name"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">
            Phone
          </label>
          <input
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
            id="phone"
            {...register("phone")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="organizationName">
          Organization
        </label>
        <input
          className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          id="organizationName"
          {...register("organizationName")}
        />
        {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName.message}</p>}
      </div>

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
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

