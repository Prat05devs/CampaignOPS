"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import {
  createEventContact,
  listEventContacts,
  updateEventContact,
  type ContactCategory,
  type ContactStatus,
  type EventContact
} from "../../lib/contacts-api";

type EventContactsProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const contactCategories: ContactCategory[] = [
  "SPONSOR",
  "GOVERNMENT_OFFICER",
  "COLLEGE",
  "VENDOR",
  "VOLUNTEER",
  "MEDIA",
  "INFLUENCER",
  "GUEST",
  "CLIENT",
  "SPEAKER",
  "PERFORMER",
  "PARTNER",
  "SUPPORTER"
];

const contactStatuses: ContactStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "CONVERTED",
  "NOT_INTERESTED",
  "CLOSED"
];

const categoryLabels: Record<ContactCategory, string> = {
  CLIENT: "Client",
  COLLEGE: "College",
  GOVERNMENT_OFFICER: "Government Officer",
  GUEST: "Guest",
  INFLUENCER: "Influencer",
  MEDIA: "Media",
  PARTNER: "Partner",
  PERFORMER: "Performer",
  SPEAKER: "Speaker",
  SPONSOR: "Sponsor",
  SUPPORTER: "Supporter",
  VENDOR: "Vendor",
  VOLUNTEER: "Volunteer"
};

const statusLabels: Record<ContactStatus, string> = {
  CLOSED: "Closed",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
  FOLLOW_UP: "Follow-up",
  INTERESTED: "Interested",
  NEW: "New",
  NOT_INTERESTED: "Not Interested"
};

const fieldClass =
  "h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";

export function EventContacts({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventContactsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [designation, setDesignation] = useState("");
  const [category, setCategory] = useState<ContactCategory>("SPONSOR");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<ContactStatus>("NEW");
  const [followUpAt, setFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  const contactsQuery = useQuery({
    queryFn: () => listEventContacts(eventId, accessToken),
    queryKey: ["events", eventId, "contacts", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(contactsQuery.error instanceof ApiError) || contactsQuery.error.status !== 401) {
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
  }, [contactsQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const input = {
        category,
        designation: cleanString(designation),
        email: cleanString(email),
        eventNotes: cleanString(eventNotes),
        followUpAt: cleanString(followUpAt),
        name: name.trim(),
        notes: cleanString(notes),
        organizationName: cleanString(organizationName),
        phone: cleanString(phone),
        source: cleanString(source),
        status
      };

      try {
        return await createEventContact(eventId, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return createEventContact(eventId, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setName("");
      setPhone("");
      setEmail("");
      setOrganizationName("");
      setDesignation("");
      setCategory("SPONSOR");
      setSource("");
      setStatus("NEW");
      setFollowUpAt("");
      setNotes("");
      setEventNotes("");
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "contacts"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ eventContactId, nextStatus }: { eventContactId: string; nextStatus: ContactStatus }) => {
      try {
        return await updateEventContact(eventId, eventContactId, { status: nextStatus }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateEventContact(eventId, eventContactId, { status: nextStatus }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "contacts"] });
    }
  });

  const contacts = contactsQuery.data ?? [];
  const summary = useMemo(() => {
    return {
      followUps: contacts.filter((item) => item.contact.status === "FOLLOW_UP").length,
      interested: contacts.filter((item) => item.contact.status === "INTERESTED").length,
      total: contacts.length
    };
  }, [contacts]);

  function handleCreateContact() {
    if (!name.trim()) {
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <ContactMetric label="Contacts" value={String(summary.total)} />
        <ContactMetric label="Interested" value={String(summary.interested)} />
        <ContactMetric label="Follow-ups" value={String(summary.followUps)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Add Contact / Stakeholder</h2>
            <p className="text-xs text-muted-foreground">Event association, category, status, notes, follow-up.</p>
          </div>
          <span className="text-xs text-muted-foreground">{contactsQuery.isFetching ? "Syncing" : "Live"}</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Name</span>
            <input className={fieldClass} onChange={(event) => setName(event.target.value)} value={name} />
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
            <span className="text-xs font-medium text-campaign-ink/70">Organization</span>
            <input
              className={fieldClass}
              onChange={(event) => setOrganizationName(event.target.value)}
              value={organizationName}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Designation</span>
            <input className={fieldClass} onChange={(event) => setDesignation(event.target.value)} value={designation} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Source</span>
            <input className={fieldClass} onChange={(event) => setSource(event.target.value)} value={source} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Category</span>
            <select className={fieldClass} onChange={(event) => setCategory(event.target.value as ContactCategory)} value={category}>
              {contactCategories.map((item) => (
                <option key={item} value={item}>
                  {categoryLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Status</span>
            <select className={fieldClass} onChange={(event) => setStatus(event.target.value as ContactStatus)} value={status}>
              {contactStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Follow-up</span>
            <input
              className={fieldClass}
              onChange={(event) => setFollowUpAt(event.target.value)}
              type="datetime-local"
              value={followUpAt}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Contact notes</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Event association notes</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setEventNotes(event.target.value)}
              value={eventNotes}
            />
          </label>
        </div>

        {createMutation.isError ? (
          <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
            {createMutation.error.message}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <Button disabled={!name.trim() || createMutation.isPending} onClick={handleCreateContact} type="button">
            {createMutation.isPending ? "Adding..." : "Add Contact"}
          </Button>
        </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {contactsQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {contactsQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Contacts / Stakeholders</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {contacts.map((item) => (
                <ContactCard
                  contact={item}
                  isUpdating={updateMutation.isPending}
                  key={item.id}
                  canManageOperations={canManageOperations}
                  onStatusChange={(nextStatus) =>
                    updateMutation.mutate({ eventContactId: item.id, nextStatus })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No contacts added to this event yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ContactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <UsersRound className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ContactCard({
  canManageOperations,
  contact,
  isUpdating,
  onStatusChange
}: {
  canManageOperations: boolean;
  contact: EventContact;
  isUpdating: boolean;
  onStatusChange: (status: ContactStatus) => void;
}) {
  return (
    <article className="rounded-md border border-campaign-mist bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{contact.contact.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {categoryLabels[contact.contact.category]}{contact.contact.organizationName ? ` · ${contact.contact.organizationName}` : ""}
          </p>
        </div>
        <span className="rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70">
          {statusLabels[contact.contact.status]}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-campaign-ink/70 md:grid-cols-2">
        <ContactInfo icon={Phone} value={contact.contact.phone ?? "-"} />
        <ContactInfo icon={Mail} value={contact.contact.email ?? "-"} />
      </div>
      {contact.contact.designation ? (
        <p className="mt-3 text-xs text-muted-foreground">{contact.contact.designation}</p>
      ) : null}
      {contact.notes ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{contact.notes}</p> : null}
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] uppercase text-muted-foreground">Status</span>
        <select
          className="h-9 rounded-md border border-campaign-mist bg-white px-2 text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          disabled={isUpdating || !canManageOperations}
          onChange={(event) => onStatusChange(event.target.value as ContactStatus)}
          value={contact.contact.status}
        >
          {contactStatuses.map((item) => (
            <option key={item} value={item}>
              {statusLabels[item]}
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

function ContactInfo({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
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
