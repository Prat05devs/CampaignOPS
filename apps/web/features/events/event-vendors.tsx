"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, MapPin, Phone, Star, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { type PaymentStatus } from "../../lib/budget-api";
import {
  createEventVendor,
  listEventVendors,
  updateEventVendor,
  type EventVendor,
  type VendorCategory
} from "../../lib/vendors-api";

type EventVendorsProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const vendorCategories: VendorCategory[] = [
  "VENUE",
  "CATERING",
  "SOUND",
  "LIGHT",
  "STAGE",
  "PRINTING",
  "DECOR",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "TRANSPORT",
  "SECURITY",
  "REGISTRATION",
  "ARTISTS",
  "ANCHORS",
  "FABRICATION"
];

const paymentStatuses: PaymentStatus[] = ["NOT_STARTED", "PENDING", "PARTIAL", "PAID", "OVERDUE"];

const categoryLabels: Record<VendorCategory, string> = {
  ANCHORS: "Anchors",
  ARTISTS: "Artists",
  CATERING: "Catering",
  DECOR: "Decor",
  FABRICATION: "Fabrication",
  LIGHT: "Light",
  PHOTOGRAPHY: "Photography",
  PRINTING: "Printing",
  REGISTRATION: "Registration",
  SECURITY: "Security",
  SOUND: "Sound",
  STAGE: "Stage",
  TRANSPORT: "Transport",
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

export function EventVendors({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventVendorsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("VENUE");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [rateCard, setRateCard] = useState("");
  const [pastEventsServed, setPastEventsServed] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("NOT_STARTED");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const vendorsQuery = useQuery({
    queryFn: () => listEventVendors(eventId, accessToken),
    queryKey: ["events", eventId, "vendors", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(vendorsQuery.error instanceof ApiError) || vendorsQuery.error.status !== 401) {
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
  }, [onSessionExpired, onTokensRefreshed, refreshToken, vendorsQuery.error]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const input = {
        category,
        city: cleanString(city),
        contactName: cleanString(contactName),
        email: cleanString(email),
        name: name.trim(),
        notes: cleanString(notes),
        pastEventsServed: cleanNumber(pastEventsServed),
        paymentStatus,
        performanceNotes: cleanString(performanceNotes),
        phone: cleanString(phone),
        rateCard: parseLines(rateCard),
        rating: cleanNumber(rating),
        serviceType: cleanString(serviceType)
      };

      try {
        return await createEventVendor(eventId, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return createEventVendor(eventId, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setName("");
      setCategory("VENUE");
      setContactName("");
      setPhone("");
      setEmail("");
      setCity("");
      setServiceType("");
      setRateCard("");
      setPastEventsServed("");
      setRating("");
      setNotes("");
      setPaymentStatus("NOT_STARTED");
      setPerformanceNotes("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "vendors"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ eventVendorId, status }: { eventVendorId: string; status: PaymentStatus }) => {
      try {
        return await updateEventVendor(eventId, eventVendorId, { paymentStatus: status }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateEventVendor(eventId, eventVendorId, { paymentStatus: status }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "vendors"] });
    }
  });

  const vendors = vendorsQuery.data ?? [];
  const summary = useMemo(
    () => ({
      paid: vendors.filter((item) => item.vendor.paymentStatus === "PAID").length,
      pending: vendors.filter((item) => ["PENDING", "PARTIAL", "OVERDUE"].includes(item.vendor.paymentStatus)).length,
      total: vendors.length
    }),
    [vendors]
  );

  function handleCreateVendor() {
    if (!name.trim()) {
      return;
    }

    if (!isValidOptionalInteger(pastEventsServed, 0) || !isValidOptionalInteger(rating, 1, 5)) {
      setFormError("Past events must be 0 or more, and rating must be a whole number from 1 to 5.");
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <VendorMetric icon={Truck} label="Assigned vendors" value={String(summary.total)} />
        <VendorMetric icon={IndianRupee} label="Pending payments" value={String(summary.pending)} />
        <VendorMetric icon={Star} label="Paid vendors" value={String(summary.paid)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Add Vendor</h2>
            <p className="text-xs text-muted-foreground">Vendor details, rate card, payment status, performance notes.</p>
          </div>
          <span className="text-xs text-muted-foreground">{vendorsQuery.isFetching ? "Syncing" : "Live"}</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Vendor name</span>
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Category</span>
            <select className={fieldClass} onChange={(event) => setCategory(event.target.value as VendorCategory)} value={category}>
              {vendorCategories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Service type</span>
            <input className={fieldClass} onChange={(event) => setServiceType(event.target.value)} value={serviceType} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Contact name</span>
            <input className={fieldClass} onChange={(event) => setContactName(event.target.value)} value={contactName} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Phone</span>
            <input className={fieldClass} onChange={(event) => setPhone(event.target.value)} value={phone} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Email</span>
            <input className={fieldClass} onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">City</span>
            <input className={fieldClass} onChange={(event) => setCity(event.target.value)} value={city} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Past events served</span>
            <input
              className={fieldClass}
              min="0"
              onChange={(event) => setPastEventsServed(event.target.value)}
              type="number"
              value={pastEventsServed}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Rating</span>
            <input
              className={fieldClass}
              max="5"
              min="1"
              onChange={(event) => setRating(event.target.value)}
              type="number"
              value={rating}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Payment status</span>
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

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Rate card</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setRateCard(event.target.value)}
              value={rateCard}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Vendor notes</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Performance notes</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setPerformanceNotes(event.target.value)}
              value={performanceNotes}
            />
          </label>
        </div>

        {formError ? (
          <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
            {formError}
          </p>
        ) : null}

        {createMutation.isError ? (
          <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
            {createMutation.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button disabled={!name.trim() || createMutation.isPending} onClick={handleCreateVendor} type="button">
            {createMutation.isPending ? "Adding..." : "Assign Vendor"}
          </Button>
        </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {vendorsQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {vendorsQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Assigned Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {vendors.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {vendors.map((item) => (
                <VendorCard
                  isUpdating={updateMutation.isPending}
                  item={item}
                  key={item.id}
                  canManageOperations={canManageOperations}
                  onPaymentStatusChange={(status) => updateMutation.mutate({ eventVendorId: item.id, status })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No vendors assigned to this event yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function VendorMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function VendorCard({
  canManageOperations,
  isUpdating,
  item,
  onPaymentStatusChange
}: {
  canManageOperations: boolean;
  isUpdating: boolean;
  item: EventVendor;
  onPaymentStatusChange: (status: PaymentStatus) => void;
}) {
  const rateCard = Array.isArray(item.vendor.rateCardJson) ? item.vendor.rateCardJson : [];

  return (
    <article className="rounded-md border border-campaign-mist bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{item.vendor.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {categoryLabels[item.vendor.category]}{item.vendor.serviceType ? ` · ${item.vendor.serviceType}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70">
          {paymentStatusLabels[item.vendor.paymentStatus]}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-campaign-ink/70 md:grid-cols-2">
        <VendorInfo icon={Phone} value={item.vendor.phone ?? "-"} />
        <VendorInfo icon={MapPin} value={item.vendor.city ?? "-"} />
      </div>
      {item.vendor.contactName ? (
        <p className="mt-3 text-xs text-muted-foreground">Contact: {item.vendor.contactName}</p>
      ) : null}
      {rateCard.length ? (
        <div className="mt-3 space-y-1">
          {rateCard.slice(0, 3).map((line) => (
            <p className="truncate text-xs text-muted-foreground" key={line}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {item.performanceNotes ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.performanceNotes}</p> : null}
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] uppercase text-muted-foreground">Payment</span>
        <select
          className="h-9 rounded-md border border-campaign-mist bg-white px-2 text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          disabled={isUpdating || !canManageOperations}
          onChange={(event) => onPaymentStatusChange(event.target.value as PaymentStatus)}
          value={item.vendor.paymentStatus}
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

function VendorInfo({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-campaign-orange" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNumber(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? Number(trimmed) : undefined;
}

function isValidOptionalInteger(value: string, min: number, max?: number) {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  const number = Number(trimmed);
  return Number.isInteger(number) && number >= min && (max === undefined || number <= max);
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
