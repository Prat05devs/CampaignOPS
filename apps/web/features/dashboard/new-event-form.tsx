"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EVENT_CATEGORIES, SCALE_TIERS, type EventCategoryId, type ScaleTierId } from "@campaignops/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { refreshSession, type AuthTokens } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { createEvent, type EventCategory, type EventScaleTier, type EventStatus } from "../../lib/events-api";

const categoryApiValues: Record<EventCategoryId, EventCategory> = {
  government_csr: "GOVERNMENT_CSR",
  holy_sin_cafe: "HOLY_SIN_CAFE",
  prime_circle: "PRIME_CIRCLE",
  private_client: "PRIVATE_CLIENT"
};

const scaleApiValues: Record<ScaleTierId, EventScaleTier> = {
  large: "LARGE",
  mass: "MASS",
  medium: "MEDIUM",
  micro: "MICRO",
  small: "SMALL"
};

const eventStatuses: EventStatus[] = ["DRAFT", "PLANNING", "ACTIVE", "ON_HOLD"];

const optionalString = z.string().trim().optional().or(z.literal(""));
const optionalNumberString = z
  .string()
  .trim()
  .refine((value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0), "Use a positive number.");

const newEventSchema = z.object({
  title: z.string().trim().min(2, "Event title is required."),
  objective: optionalString,
  categoryId: z.custom<EventCategoryId>((value) => EVENT_CATEGORIES.some((category) => category.id === value)),
  subtype: z.string().trim().min(2, "Subtype is required."),
  scaleTierId: z.custom<ScaleTierId>((value) => SCALE_TIERS.some((tier) => tier.id === value)),
  city: optionalString,
  venue: optionalString,
  expectedPax: optionalNumberString,
  estimatedBudgetAmount: optionalNumberString,
  startsAt: optionalString,
  endsAt: optionalString,
  departmentOrClient: optionalString,
  stakeholders: optionalString,
  brandContext: optionalString,
  status: z.enum(["DRAFT", "PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"])
});

type NewEventFormValues = z.infer<typeof newEventSchema>;

type NewEventFormProps = {
  accessToken: string;
  refreshToken: string;
  onCreated: () => void;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: AuthTokens) => void;
};

const fieldClass =
  "h-10 w-full rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const textAreaClass =
  "min-h-20 w-full rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const labelClass = "text-xs font-medium text-campaign-ink/70";

export function NewEventForm({
  accessToken,
  refreshToken,
  onCreated,
  onSessionExpired,
  onTokensRefreshed
}: NewEventFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<NewEventFormValues>({
    resolver: zodResolver(newEventSchema),
    defaultValues: {
      brandContext: "",
      categoryId: "government_csr",
      city: "",
      departmentOrClient: "",
      endsAt: "",
      estimatedBudgetAmount: "",
      expectedPax: "",
      objective: "",
      scaleTierId: "micro",
      startsAt: "",
      stakeholders: "",
      status: "DRAFT",
      subtype: "Observance Day",
      title: "",
      venue: ""
    }
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = EVENT_CATEGORIES.find((category) => category.id === selectedCategoryId);

  useEffect(() => {
    if (selectedCategory && !selectedCategory.subtypes.some((subtype) => subtype === form.getValues("subtype"))) {
      form.setValue("subtype", selectedCategory.subtypes[0], { shouldValidate: true });
    }
  }, [form, selectedCategory]);

  const createMutation = useMutation({
    mutationFn: async (values: NewEventFormValues) => {
      const input = toCreateEventInput(values);

      try {
        return await createEvent(input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        try {
          const refreshedSession = await refreshSession(refreshToken);
          onTokensRefreshed(refreshedSession.tokens);
          return await createEvent(input, refreshedSession.tokens.accessToken);
        } catch {
          onSessionExpired();
          throw new Error("Session expired. Please log in again.");
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      form.reset();
      onCreated();
    }
  });

  function handleSubmit(values: NewEventFormValues) {
    createMutation.mutate(values);
  }

  return (
    <form className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm" onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">New Event Wizard</h2>
          <p className="text-xs text-muted-foreground">Type, details, scale, budget, timeline, stakeholders.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
          <CalendarPlus className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <fieldset className="space-y-3 rounded-md border border-campaign-mist p-3">
          <legend className="px-1 text-xs font-semibold text-campaign-ink">Step 1</legend>
          <label className="grid gap-1">
            <span className={labelClass}>Event type</span>
            <select className={fieldClass} {...form.register("categoryId")}>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>Subtype</span>
            <select className={fieldClass} {...form.register("subtype")}>
              {(selectedCategory?.subtypes ?? []).map((subtype) => (
                <option key={subtype} value={subtype}>
                  {subtype}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-campaign-mist p-3">
          <legend className="px-1 text-xs font-semibold text-campaign-ink">Step 2</legend>
          <label className="grid gap-1">
            <span className={labelClass}>Event title</span>
            <input className={fieldClass} {...form.register("title")} />
            {form.formState.errors.title ? (
              <span className="text-xs text-campaign-orange">{form.formState.errors.title.message}</span>
            ) : null}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className={labelClass}>Scale tier</span>
              <select className={fieldClass} {...form.register("scaleTierId")}>
                {SCALE_TIERS.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className={labelClass}>Expected pax</span>
              <input className={fieldClass} min="0" type="number" {...form.register("expectedPax")} />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className={labelClass}>City</span>
              <input className={fieldClass} {...form.register("city")} />
            </label>
            <label className="grid gap-1">
              <span className={labelClass}>Venue</span>
              <input className={fieldClass} {...form.register("venue")} />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-campaign-mist p-3">
          <legend className="px-1 text-xs font-semibold text-campaign-ink">Step 3</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className={labelClass}>Budget</span>
              <input className={fieldClass} min="0" type="number" {...form.register("estimatedBudgetAmount")} />
            </label>
            <label className="grid gap-1">
              <span className={labelClass}>Status</span>
              <select className={fieldClass} {...form.register("status")}>
                {eventStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1">
              <span className={labelClass}>Starts</span>
              <input className={fieldClass} type="datetime-local" {...form.register("startsAt")} />
            </label>
            <label className="grid gap-1">
              <span className={labelClass}>Ends</span>
              <input className={fieldClass} type="datetime-local" {...form.register("endsAt")} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className={labelClass}>Department / client / org</span>
            <input className={fieldClass} {...form.register("departmentOrClient")} />
          </label>
        </fieldset>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <label className="grid gap-1 xl:col-span-1">
          <span className={labelClass}>Stakeholders</span>
          <textarea className={textAreaClass} {...form.register("stakeholders")} />
        </label>
        <label className="grid gap-1 xl:col-span-1">
          <span className={labelClass}>Objective</span>
          <textarea className={textAreaClass} {...form.register("objective")} />
        </label>
        <label className="grid gap-1 xl:col-span-1">
          <span className={labelClass}>Brand context</span>
          <textarea className={textAreaClass} {...form.register("brandContext")} />
        </label>
      </div>

      {createMutation.isError ? (
        <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
          {createMutation.error.message}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button disabled={createMutation.isPending} type="submit">
          {createMutation.isPending ? "Creating..." : "Create Event"}
        </Button>
      </div>
    </form>
  );
}

function toCreateEventInput(values: NewEventFormValues) {
  return {
    brandContext: cleanString(values.brandContext),
    category: categoryApiValues[values.categoryId],
    city: cleanString(values.city),
    departmentOrClient: cleanString(values.departmentOrClient),
    endsAt: cleanString(values.endsAt),
    estimatedBudgetAmount: cleanNumber(values.estimatedBudgetAmount),
    expectedPax: cleanNumber(values.expectedPax),
    objective: cleanString(values.objective),
    scaleTier: scaleApiValues[values.scaleTierId],
    startsAt: cleanString(values.startsAt),
    stakeholders: parseStakeholders(values.stakeholders),
    status: values.status,
    subtype: values.subtype,
    title: values.title,
    venue: cleanString(values.venue)
  };
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function parseStakeholders(value?: string) {
  return value
    ?.split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
