"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, ClipboardCheck, Pencil, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  acceptAIOutput,
  convertAIOutputToTasks,
  generateEventPlan,
  listAIOutputs,
  updateAIOutput,
  type AIOutput
} from "../../lib/ai-api";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";

type EventAIPlanProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

type EventPlanJson = {
  assumptions?: string[];
  confidenceLevel?: string;
  eventFlow?: string[];
  logisticsChecklist?: string[];
  manpowerPlan?: Array<{ count?: number; notes?: string; role?: string }>;
  mediaCoveragePlan?: string[];
  minuteToMinuteSchedule?: Array<{ activity?: string; owner?: string; time?: string }>;
  needsConfirmation?: string[];
  postEventReportStructure?: string[];
  riskChecklist?: Array<{ mitigation?: string; needsConfirmation?: boolean; risk?: string }>;
  stageStallRequirements?: string[];
  strategySummary?: string;
  vendorRequirements?: Array<{ category?: string; notes?: string; requirement?: string }>;
  knownFromProvidedData?: string[];
  sourcesUsed?: string[];
};

export function EventAIPlan({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventAIPlanProps) {
  const queryClient = useQueryClient();
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState("");

  const outputsQuery = useQuery({
    queryFn: () => listAIOutputs(eventId, accessToken),
    queryKey: ["events", eventId, "ai-outputs", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(outputsQuery.error instanceof ApiError) || outputsQuery.error.status !== 401) {
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
  }, [onSessionExpired, onTokensRefreshed, outputsQuery.error, refreshToken]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      try {
        return await generateEventPlan(eventId, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return generateEventPlan(eventId, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "ai-outputs"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ outputId, responseJson }: { outputId: string; responseJson: unknown }) => {
      try {
        return await updateAIOutput(eventId, outputId, { responseJson }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateAIOutput(eventId, outputId, { responseJson }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setEditingOutputId(null);
      setEditorError(null);
      setEditorValue("");
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "ai-outputs"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const acceptMutation = useMutation({
    mutationFn: async (outputId: string) => {
      try {
        return await acceptAIOutput(eventId, outputId, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return acceptAIOutput(eventId, outputId, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "ai-outputs"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const convertToTasksMutation = useMutation({
    mutationFn: async (outputId: string) => {
      try {
        return await convertAIOutputToTasks(eventId, outputId, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return convertAIOutputToTasks(eventId, outputId, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const outputs = outputsQuery.data ?? [];
  const eventPlanOutputs = outputs.filter((output) => output.outputType === "EVENT_PLAN");
  const summary = useMemo(
    () => ({
      accepted: eventPlanOutputs.filter((output) => output.isAccepted).length,
      latestConfidence: readEventPlan(eventPlanOutputs[0])?.confidenceLevel ?? "-",
      total: eventPlanOutputs.length
    }),
    [eventPlanOutputs]
  );

  function startEditing(output: AIOutput) {
    setEditingOutputId(output.id);
    setEditorError(null);
    setEditorValue(JSON.stringify(output.responseJson, null, 2));
  }

  function saveEditedOutput(outputId: string) {
    try {
      const responseJson = JSON.parse(editorValue);
      updateMutation.mutate({ outputId, responseJson });
    } catch {
      setEditorError("Edited output must be valid JSON.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <AIPlanMetric icon={Bot} label="Saved plans" value={String(summary.total)} />
        <AIPlanMetric icon={CheckCircle2} label="Approved" value={String(summary.accepted)} />
        <AIPlanMetric icon={ClipboardCheck} label="Confidence" value={summary.latestConfidence} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Mock AI Event Plan Generator</h2>
              <p className="text-xs text-muted-foreground">Structured JSON output, saved for review, editable, and human-approved.</p>
            </div>
            <Button disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()} type="button">
              <Sparkles className="h-4 w-4" />
              {generateMutation.isPending ? "Generating..." : "Generate Plan"}
            </Button>
          </div>
          {generateMutation.isError ? (
            <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
              {generateMutation.error.message}
            </p>
          ) : null}
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {outputsQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {outputsQuery.error.message}
        </div>
      ) : null}

      {convertToTasksMutation.isSuccess ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Created {convertToTasksMutation.data.convertedCount} task{convertToTasksMutation.data.convertedCount === 1 ? "" : "s"} from the approved AI plan.
        </div>
      ) : null}

      {convertToTasksMutation.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {convertToTasksMutation.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>AI Event Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {eventPlanOutputs.length ? (
            <div className="space-y-4">
              {eventPlanOutputs.map((output) => (
                <AIPlanCard
                  canManageOperations={canManageOperations}
                  editorError={editingOutputId === output.id ? editorError : null}
                  editorValue={editingOutputId === output.id ? editorValue : ""}
                  isAccepting={acceptMutation.isPending}
                  isConverting={convertToTasksMutation.isPending}
                  isEditing={editingOutputId === output.id}
                  isSaving={updateMutation.isPending}
                  key={output.id}
                  onAccept={() => acceptMutation.mutate(output.id)}
                  onCancelEdit={() => {
                    setEditingOutputId(null);
                    setEditorError(null);
                    setEditorValue("");
                  }}
                  onEditorChange={setEditorValue}
                  onConvertToTasks={() => convertToTasksMutation.mutate(output.id)}
                  onSaveEdit={() => saveEditedOutput(output.id)}
                  onStartEdit={() => startEditing(output)}
                  output={output}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No AI event plan generated yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AIPlanCard({
  canManageOperations,
  editorError,
  editorValue,
  isAccepting,
  isConverting,
  isEditing,
  isSaving,
  onAccept,
  onCancelEdit,
  onConvertToTasks,
  onEditorChange,
  onSaveEdit,
  onStartEdit,
  output
}: {
  canManageOperations: boolean;
  editorError: string | null;
  editorValue: string;
  isAccepting: boolean;
  isConverting: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onAccept: () => void;
  onCancelEdit: () => void;
  onConvertToTasks: () => void;
  onEditorChange: (value: string) => void;
  onSaveEdit: () => void;
  onStartEdit: () => void;
  output: AIOutput;
}) {
  const plan = readEventPlan(output);

  return (
    <article className="rounded-md border border-campaign-mist bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{output.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {output.createdBy.name} · {formatDateTime(output.updatedAt)}
          </p>
        </div>
        <span className={output.isAccepted ? "rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700" : "rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70"}>
          {output.isAccepted ? "Approved" : "Needs review"}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <textarea
            className="min-h-96 w-full rounded-md border border-campaign-mist bg-white px-3 py-2 font-mono text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
            onChange={(event) => onEditorChange(event.target.value)}
            value={editorValue}
          />
          {editorError ? (
            <p className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
              {editorError}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button disabled={isSaving} onClick={onCancelEdit} type="button" variant="outline">
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={onSaveEdit} type="button">
              {isSaving ? "Saving..." : "Save Edited JSON"}
            </Button>
          </div>
        </div>
      ) : plan ? (
        <div className="space-y-4">
          <p className="rounded-md border border-campaign-mist bg-campaign-cream px-3 py-2 text-sm leading-6 text-campaign-ink/80">
            {plan.strategySummary}
          </p>
          <AISection title="Known From Provided Data" items={plan.knownFromProvidedData} />
          <AISection title="Event Flow" items={plan.eventFlow} />
          <AIScheduleSection items={plan.minuteToMinuteSchedule} />
          <AIManpowerSection items={plan.manpowerPlan} />
          <AIVendorSection items={plan.vendorRequirements} />
          <AISection title="Logistics Checklist" items={plan.logisticsChecklist} />
          <AISection title="Stage / Stall Requirements" items={plan.stageStallRequirements} />
          <AISection title="Media Coverage Plan" items={plan.mediaCoveragePlan} />
          <AIRiskSection items={plan.riskChecklist} />
          <AISection title="Post-event Report Structure" items={plan.postEventReportStructure} />
          <AISection title="Assumptions" items={plan.assumptions} />
          <AISection title="Needs Confirmation" items={plan.needsConfirmation} />
          <AISection title="Sources Used" items={plan.sourcesUsed} />
        </div>
      ) : (
        <pre className="max-h-96 overflow-auto rounded-md border border-campaign-mist bg-campaign-cream p-3 text-xs">
          {JSON.stringify(output.responseJson, null, 2)}
        </pre>
      )}

      {canManageOperations ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onStartEdit} type="button" variant="outline">
            <Pencil className="h-4 w-4" />
            Edit JSON
          </Button>
          <Button disabled={output.isAccepted || isAccepting} onClick={onAccept} type="button">
            {isAccepting ? "Approving..." : output.isAccepted ? "Approved" : "Approve Output"}
          </Button>
          <Button disabled={!output.isAccepted || isConverting} onClick={onConvertToTasks} type="button">
            {isConverting ? "Converting..." : "Convert to Tasks"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function AIPlanMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Bot;
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

function AISection({ items, title }: { items?: string[]; title: string }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">{title}</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs leading-5 text-campaign-ink/75" key={item}>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function AIScheduleSection({ items }: { items?: EventPlanJson["minuteToMinuteSchedule"] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Minute-to-minute Schedule</h4>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div className="grid gap-2 rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs md:grid-cols-[100px_1fr_160px]" key={`${item.time}-${index}`}>
            <span className="font-semibold">{item.time}</span>
            <span className="text-campaign-ink/75">{item.activity}</span>
            <span className="text-muted-foreground">{item.owner}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIManpowerSection({ items }: { items?: EventPlanJson["manpowerPlan"] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Manpower Plan</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item, index) => (
          <div className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs leading-5" key={`${item.role}-${index}`}>
            <p className="font-semibold">{item.role} · {item.count ?? 0}</p>
            <p className="mt-1 text-muted-foreground">{item.notes}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIVendorSection({ items }: { items?: EventPlanJson["vendorRequirements"] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Vendor Requirements</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item, index) => (
          <div className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs leading-5" key={`${item.category}-${index}`}>
            <p className="font-semibold">{item.category} · {item.requirement}</p>
            <p className="mt-1 text-muted-foreground">{item.notes}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AIRiskSection({ items }: { items?: EventPlanJson["riskChecklist"] }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Risk Checklist</h4>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item, index) => (
          <div className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs leading-5" key={`${item.risk}-${index}`}>
            <p className="font-semibold">{item.risk}{item.needsConfirmation ? " · Needs confirmation" : ""}</p>
            <p className="mt-1 text-muted-foreground">{item.mitigation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Your role has read-only access for this workspace area.
    </div>
  );
}

function readEventPlan(output?: AIOutput): EventPlanJson | null {
  if (!output || !output.responseJson || typeof output.responseJson !== "object") {
    return null;
  }

  return output.responseJson as EventPlanJson;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
