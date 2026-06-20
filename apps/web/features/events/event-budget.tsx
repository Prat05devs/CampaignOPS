"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeIndianRupee, CircleAlert, Landmark, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import {
  createBudgetItem,
  listBudgetItems,
  updateBudgetItem,
  type BudgetCategory,
  type BudgetItem,
  type PaymentStatus
} from "../../lib/budget-api";
import { type CampaignEvent } from "../../lib/events-api";

type EventBudgetProps = {
  accessToken: string;
  canManageOperations: boolean;
  event: CampaignEvent;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const budgetCategories: BudgetCategory[] = [
  "VENUE",
  "FOOD",
  "PRINTING",
  "BRANDING",
  "STAGE",
  "SOUND",
  "LIGHTING",
  "TRAVEL",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "ADS",
  "TEAM",
  "GUEST_HOSPITALITY",
  "VENDOR_PAYMENTS",
  "MISCELLANEOUS"
];

const paymentStatuses: PaymentStatus[] = ["NOT_STARTED", "PENDING", "PARTIAL", "PAID", "OVERDUE"];

const categoryLabels: Record<BudgetCategory, string> = {
  ADS: "Ads",
  BRANDING: "Branding",
  FOOD: "Food",
  GUEST_HOSPITALITY: "Guest Hospitality",
  LIGHTING: "Lighting",
  MISCELLANEOUS: "Miscellaneous",
  PHOTOGRAPHY: "Photography",
  PRINTING: "Printing",
  SOUND: "Sound",
  STAGE: "Stage",
  TEAM: "Team",
  TRAVEL: "Travel",
  VENDOR_PAYMENTS: "Vendor Payments",
  VENUE: "Venue",
  VIDEOGRAPHY: "Videography"
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  NOT_STARTED: "Not Started",
  OVERDUE: "Overdue",
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Pending"
};

const fieldClass =
  "h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";

export function EventBudget({
  accessToken,
  canManageOperations,
  event,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventBudgetProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<BudgetCategory>("VENUE");
  const [title, setTitle] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("NOT_STARTED");
  const [notes, setNotes] = useState("");

  const budgetQuery = useQuery({
    queryFn: () => listBudgetItems(event.id, accessToken),
    queryKey: ["events", event.id, "budget-items", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(budgetQuery.error instanceof ApiError) || budgetQuery.error.status !== 401) {
        return;
      }

      try {
        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
      } catch {
        onSessionExpired();
      }
    }

    void refreshExpiredAccessToken();
  }, [budgetQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const input = {
        actualAmount: cleanNumber(actualAmount),
        category,
        estimatedAmount: cleanNumber(estimatedAmount),
        notes: cleanString(notes),
        paymentStatus,
        title: title.trim()
      };

      try {
        return await createBudgetItem(event.id, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return createBudgetItem(event.id, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setCategory("VENUE");
      setTitle("");
      setEstimatedAmount("");
      setActualAmount("");
      setPaymentStatus("NOT_STARTED");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["events", event.id, "budget-items"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: PaymentStatus }) => {
      try {
        return await updateBudgetItem(event.id, itemId, { paymentStatus: status }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateBudgetItem(event.id, itemId, { paymentStatus: status }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", event.id, "budget-items"] });
    }
  });

  const budgetItems = budgetQuery.data ?? [];
  const summary = useMemo(() => summarizeBudget(budgetItems, event), [budgetItems, event]);

  function handleCreateBudgetItem() {
    if (!title.trim()) {
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BudgetMetric icon={WalletCards} label="Estimated" value={formatCurrency(summary.estimated)} />
        <BudgetMetric icon={BadgeIndianRupee} label="Actual spend" value={formatCurrency(summary.actual)} />
        <BudgetMetric icon={Landmark} label="Remaining" value={formatCurrency(summary.remaining)} />
        <BudgetMetric icon={CircleAlert} label="Variance" value={formatCurrency(summary.variance)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Budget Line Item</h2>
            <p className="text-xs text-muted-foreground">Estimated, actual, payment status, notes.</p>
          </div>
          <span className="text-xs text-muted-foreground">{budgetQuery.isFetching ? "Syncing" : "Live"}</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-[170px_1fr_150px_150px_170px]">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Category</span>
            <select className={fieldClass} onChange={(event) => setCategory(event.target.value as BudgetCategory)} value={category}>
              {budgetCategories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Title</span>
            <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Estimated</span>
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => setEstimatedAmount(event.target.value)}
              type="number"
              value={estimatedAmount}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Actual</span>
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => setActualAmount(event.target.value)}
              type="number"
              value={actualAmount}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Payment</span>
            <select
              className={fieldClass}
              onChange={(event) => setPaymentStatus(event.target.value as PaymentStatus)}
              value={paymentStatus}
            >
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {paymentStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 grid gap-1">
          <span className="text-xs font-medium text-campaign-ink/70">Notes</span>
          <textarea
            className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </label>

        {createMutation.isError ? (
          <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
            {createMutation.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button disabled={!title.trim() || createMutation.isPending} onClick={handleCreateBudgetItem} type="button">
            {createMutation.isPending ? "Adding..." : "Add Line Item"}
          </Button>
        </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {budgetQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {budgetQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Budget Items</CardTitle>
        </CardHeader>
        <CardContent>
          {budgetItems.length ? (
            <div className="space-y-3">
              {budgetItems.map((item) => (
                <BudgetLineItem
                  isUpdating={updateMutation.isPending}
                  item={item}
                  key={item.id}
                  canManageOperations={canManageOperations}
                  onPaymentStatusChange={(status) => updateMutation.mutate({ itemId: item.id, status })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No budget line items yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function BudgetMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function BudgetLineItem({
  canManageOperations,
  isUpdating,
  item,
  onPaymentStatusChange
}: {
  canManageOperations: boolean;
  isUpdating: boolean;
  item: BudgetItem;
  onPaymentStatusChange: (status: PaymentStatus) => void;
}) {
  const variance = Number(item.actualAmount) - Number(item.estimatedAmount);

  return (
    <article className="grid gap-3 rounded-md border border-campaign-mist bg-white p-3 md:grid-cols-[1fr_130px_130px_150px] md:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {categoryLabels[item.category]}{item.vendor ? ` · ${item.vendor.name}` : ""}
        </p>
        {item.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.notes}</p> : null}
      </div>
      <div>
        <p className="text-[11px] uppercase text-muted-foreground">Estimated</p>
        <p className="mt-1 text-sm font-medium">{formatCurrency(Number(item.estimatedAmount))}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase text-muted-foreground">Actual</p>
        <p className="mt-1 text-sm font-medium">{formatCurrency(Number(item.actualAmount))}</p>
        <p className={variance > 0 ? "mt-1 text-xs text-campaign-orange" : "mt-1 text-xs text-muted-foreground"}>
          {formatCurrency(variance)}
        </p>
      </div>
      <label className="grid gap-1">
        <span className="text-[11px] uppercase text-muted-foreground">Payment</span>
        <select
          className="h-9 rounded-md border border-campaign-mist bg-white px-2 text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          disabled={isUpdating || !canManageOperations}
          onChange={(event) => onPaymentStatusChange(event.target.value as PaymentStatus)}
          value={item.paymentStatus}
        >
          {paymentStatuses.map((status) => (
            <option key={status} value={status}>
              {paymentStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Your role has read-only access for this workspace area.
    </div>
  );
}

function summarizeBudget(items: BudgetItem[], event: CampaignEvent) {
  const estimated = items.reduce((sum, item) => sum + Number(item.estimatedAmount), 0);
  const actual = items.reduce((sum, item) => sum + Number(item.actualAmount), 0);
  const eventEstimate = Number(event.estimatedBudgetAmount ?? 0);
  const budgetBase = estimated || eventEstimate;

  return {
    actual,
    estimated: budgetBase,
    remaining: budgetBase - actual,
    variance: actual - budgetBase
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    compactDisplay: "short",
    currency: "INR",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency"
  }).format(value);
}
