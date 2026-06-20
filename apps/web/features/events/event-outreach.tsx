"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clipboard, MailPlus, MessageSquareText, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";
import {
  createOutreachTemplate,
  listOutreachTemplates,
  updateOutreachTemplate,
  type OutreachDraftType,
  type OutreachRecipientType,
  type OutreachTemplate
} from "../../lib/outreach-api";

type EventOutreachProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  eventTitle: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const recipientTypes: OutreachRecipientType[] = [
  "SPONSOR",
  "COLLEGE",
  "GOVERNMENT_DEPARTMENT",
  "PSU",
  "VOLUNTEER",
  "SPEAKER",
  "INFLUENCER",
  "MEDIA",
  "VENDOR",
  "CLIENT"
];

const draftTypes: OutreachDraftType[] = [
  "EMAIL",
  "WHATSAPP",
  "CALL_SCRIPT",
  "FOLLOW_UP",
  "SPONSORSHIP_REQUEST",
  "GOVERNMENT_PSU_LETTER",
  "COLLEGE_OUTREACH",
  "INVITATION_LETTER",
  "PRESS_RELEASE",
  "THANK_YOU_NOTE"
];

const recipientLabels: Record<OutreachRecipientType, string> = {
  CLIENT: "Client",
  COLLEGE: "College",
  GOVERNMENT_DEPARTMENT: "Government Department",
  INFLUENCER: "Influencer",
  MEDIA: "Media",
  PSU: "PSU",
  SPEAKER: "Speaker",
  SPONSOR: "Sponsor",
  VENDOR: "Vendor",
  VOLUNTEER: "Volunteer"
};

const draftTypeLabels: Record<OutreachDraftType, string> = {
  CALL_SCRIPT: "Call Script",
  COLLEGE_OUTREACH: "College Outreach",
  EMAIL: "Email Draft",
  FOLLOW_UP: "Follow-up",
  GOVERNMENT_PSU_LETTER: "Government / PSU Letter",
  INVITATION_LETTER: "Invitation Letter",
  PRESS_RELEASE: "Press Release",
  SPONSORSHIP_REQUEST: "Sponsorship Request",
  THANK_YOU_NOTE: "Thank-you Note",
  WHATSAPP: "WhatsApp Message"
};

const fieldClass =
  "h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const textAreaClass =
  "min-h-40 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";

export function EventOutreach({
  accessToken,
  canManageOperations,
  eventId,
  eventTitle,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventOutreachProps) {
  const queryClient = useQueryClient();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<OutreachDraftType>("EMAIL");
  const [recipientType, setRecipientType] = useState<OutreachRecipientType>("SPONSOR");
  const [title, setTitle] = useState("");

  const outreachQuery = useQuery({
    queryFn: () => listOutreachTemplates(eventId, accessToken),
    queryKey: ["events", eventId, "outreach-templates", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(outreachQuery.error instanceof ApiError) || outreachQuery.error.status !== 401) {
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
  }, [onSessionExpired, onTokensRefreshed, outreachQuery.error, refreshToken]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        body: body.trim(),
        channel: draftType,
        recipientType,
        title: title.trim()
      };

      try {
        if (activeTemplateId) {
          return await updateOutreachTemplate(eventId, activeTemplateId, input, accessToken);
        }

        return await createOutreachTemplate(eventId, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);

        if (activeTemplateId) {
          return updateOutreachTemplate(eventId, activeTemplateId, input, refreshedSession.tokens.accessToken);
        }

        return createOutreachTemplate(eventId, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "outreach-templates"] });
    }
  });

  const templates = outreachQuery.data ?? [];
  const summary = useMemo(
    () => ({
      channels: new Set(templates.map((template) => template.channel)).size,
      recipients: new Set(templates.map((template) => template.recipientType)).size,
      total: templates.length
    }),
    [templates]
  );

  function handleSaveTemplate() {
    if (!title.trim() || body.trim().length < 10) {
      return;
    }

    saveMutation.mutate();
  }

  function loadTemplate(template: OutreachTemplate) {
    setActiveTemplateId(template.id);
    setBody(template.body);
    setDraftType(template.channel as OutreachDraftType);
    setRecipientType(template.recipientType);
    setTitle(template.title);
  }

  function resetForm() {
    setActiveTemplateId(null);
    setBody("");
    setDraftType("EMAIL");
    setRecipientType("SPONSOR");
    setTitle("");
  }

  function useStarter() {
    setBody(buildDraftStarter(draftType, recipientType, eventTitle));
    if (!title.trim()) {
      setTitle(`${draftTypeLabels[draftType]} - ${recipientLabels[recipientType]}`);
    }
  }

  async function copyTemplate(template: OutreachTemplate) {
    await navigator.clipboard.writeText(template.body);
    setCopiedTemplateId(template.id);
    window.setTimeout(() => setCopiedTemplateId(null), 1500);
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <OutreachMetric icon={MessageSquareText} label="Saved drafts" value={String(summary.total)} />
        <OutreachMetric icon={Send} label="Recipient types" value={String(summary.recipients)} />
        <OutreachMetric icon={MailPlus} label="Draft formats" value={String(summary.channels)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{activeTemplateId ? "Edit Outreach Draft" : "New Outreach Draft"}</h2>
              <p className="text-xs text-muted-foreground">{outreachQuery.isFetching ? "Syncing" : "Live"}</p>
            </div>
            <Button onClick={useStarter} type="button" variant="outline">
              Draft Starter
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px]">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Title</span>
              <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} value={title} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Draft type</span>
              <select className={fieldClass} onChange={(event) => setDraftType(event.target.value as OutreachDraftType)} value={draftType}>
                {draftTypes.map((item) => (
                  <option key={item} value={item}>
                    {draftTypeLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Recipient</span>
              <select
                className={fieldClass}
                onChange={(event) => setRecipientType(event.target.value as OutreachRecipientType)}
                value={recipientType}
              >
                {recipientTypes.map((item) => (
                  <option key={item} value={item}>
                    {recipientLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Draft body</span>
            <textarea className={textAreaClass} onChange={(event) => setBody(event.target.value)} value={body} />
          </label>

          {saveMutation.isError ? (
            <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
              {saveMutation.error.message}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            {activeTemplateId ? (
              <Button onClick={resetForm} type="button" variant="outline">
                New Draft
              </Button>
            ) : null}
            <Button disabled={!title.trim() || body.trim().length < 10 || saveMutation.isPending} onClick={handleSaveTemplate} type="button">
              {saveMutation.isPending ? "Saving..." : activeTemplateId ? "Save Changes" : "Save Template"}
            </Button>
          </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {outreachQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {outreachQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Outreach Drafts</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {templates.map((template) => (
                <OutreachCard
                  canManageOperations={canManageOperations}
                  copied={copiedTemplateId === template.id}
                  key={template.id}
                  onCopy={() => copyTemplate(template)}
                  onEdit={() => loadTemplate(template)}
                  template={template}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No outreach drafts saved for this event yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function OutreachMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof MessageSquareText;
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

function OutreachCard({
  canManageOperations,
  copied,
  onCopy,
  onEdit,
  template
}: {
  canManageOperations: boolean;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  template: OutreachTemplate;
}) {
  return (
    <article className="rounded-md border border-campaign-mist bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{template.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDraftType(template.channel)} · {recipientLabels[template.recipientType]}
          </p>
        </div>
        <span className="rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70">
          v{template.version}
        </span>
      </div>
      <p className="mt-3 line-clamp-5 whitespace-pre-line text-xs leading-5 text-muted-foreground">{template.body}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">Saved by {template.createdBy.name}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onCopy} size="sm" type="button" variant="outline">
          <Clipboard className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </Button>
        {canManageOperations ? (
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            Edit
          </Button>
        ) : null}
      </div>
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

function buildDraftStarter(draftType: OutreachDraftType, recipientType: OutreachRecipientType, eventTitle: string) {
  const recipient = recipientLabels[recipientType].toLowerCase();
  const eventName = eventTitle || "this event";

  const starters: Record<OutreachDraftType, string> = {
    CALL_SCRIPT: `Hi, this is regarding ${eventName}. I wanted to quickly understand if your team would be open to discussing participation as a ${recipient}. The event context, audience fit, and next steps are ready to share.`,
    COLLEGE_OUTREACH: `Dear Team,\n\nWe are planning ${eventName} and would like to explore a collaboration with your college community. The opportunity can include participation, student outreach, and on-ground coordination.\n\nRegards,`,
    EMAIL: `Dear Team,\n\nWe are reaching out regarding ${eventName}. We believe there is a relevant opportunity for your team as a ${recipient} and would like to share the event context, audience profile, and next steps.\n\nRegards,`,
    FOLLOW_UP: `Hi,\n\nFollowing up on ${eventName}. Please let us know if we can share the proposal, expected audience details, and collaboration plan for your review.\n\nRegards,`,
    GOVERNMENT_PSU_LETTER: `To Whom It May Concern,\n\nWe request your consideration for ${eventName}. The event objectives, stakeholder context, and execution plan can be shared for review and approval.\n\nRegards,`,
    INVITATION_LETTER: `Dear Guest,\n\nWe would be pleased to invite you to ${eventName}. Your presence would add meaningful value to the event and its audience.\n\nRegards,`,
    PRESS_RELEASE: `${eventName} is being organized with a focus on community engagement, stakeholder participation, and structured on-ground execution. Further event details, venue, date, and spokesperson information can be added before release.`,
    SPONSORSHIP_REQUEST: `Dear Team,\n\nWe are inviting sponsorship interest for ${eventName}. The event provides a focused opportunity to engage with a relevant audience through brand visibility, on-ground presence, and campaign participation.\n\nRegards,`,
    THANK_YOU_NOTE: `Dear Team,\n\nThank you for supporting ${eventName}. We appreciate your time, participation, and contribution to the event's execution.\n\nRegards,`,
    WHATSAPP: `Hi, sharing a quick note about ${eventName}. We are exploring ${recipient} participation and can send the event details, audience fit, and next steps for review.`
  };

  return starters[draftType];
}

function formatDraftType(value: string) {
  return draftTypeLabels[value as OutreachDraftType] ?? value.replaceAll("_", " ");
}
