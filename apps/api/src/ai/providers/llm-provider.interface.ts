export type GenerateEventPlanInput = {
  brandContext: string | null;
  category: string;
  city: string | null;
  departmentOrClient: string | null;
  endsAt: Date | null;
  estimatedBudgetAmount: unknown;
  expectedPax: number | null;
  objective: string | null;
  scaleTier: string;
  stakeholdersJson: unknown;
  startsAt: Date | null;
  subtype: string;
  title: string;
  venue: string | null;
  playbookContext?: {
    entries: Array<{
      budgetRange: string | null;
      city: string | null;
      createdAt: string;
      eventId: string | null;
      learnings: {
        reusableChecklist: string[];
        summary: string;
        whatToImprove: string[];
        whatWorked: string[];
      };
      riskNotes: string[];
      scale: string;
      vendorNotes: string[];
    }>;
  };
};

export type EventPlanOutput = {
  assumptions: string[];
  confidenceLevel: "LOW" | "MEDIUM" | "HIGH";
  eventFlow: string[];
  logisticsChecklist: string[];
  manpowerPlan: Array<{
    count: number;
    notes: string;
    role: string;
  }>;
  mediaCoveragePlan: string[];
  minuteToMinuteSchedule: Array<{
    activity: string;
    owner: string;
    time: string;
  }>;
  needsConfirmation: string[];
  postEventReportStructure: string[];
  riskChecklist: Array<{
    mitigation: string;
    needsConfirmation: boolean;
    risk: string;
  }>;
  schemaVersion: "campaignops.eventPlan.v1";
  stageStallRequirements: string[];
  strategySummary: string;
  vendorRequirements: Array<{
    category: string;
    notes: string;
    requirement: string;
  }>;
  workflowType: "EVENT_PLAN";
  knownFromProvidedData: string[];
  sourcesUsed: string[];
};

export interface LlmProvider {
  generateEventPlan(input: GenerateEventPlanInput): Promise<EventPlanOutput>;
}
