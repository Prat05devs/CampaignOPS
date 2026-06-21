import { Injectable } from "@nestjs/common";
import { EventPlanOutput, GenerateEventPlanInput, LlmProvider } from "./llm-provider.interface";

@Injectable()
export class MockAiProvider implements LlmProvider {
  async generateEventPlan(input: GenerateEventPlanInput): Promise<EventPlanOutput> {
    const pax = input.expectedPax ?? 0;
    const scaleNote = scaleToOperationsNote(input.scaleTier, pax);
    const stakeholders = Array.isArray(input.stakeholdersJson) ? input.stakeholdersJson.filter(isString) : [];
    const budget = input.estimatedBudgetAmount ? Number(input.estimatedBudgetAmount) : 0;

    return {
      assumptions: [
        input.startsAt ? "The event starts on the date currently stored in the event record." : "Final event date is not available in current knowledge base.",
        budget ? "Budget planning should stay within the event estimate until actual vendor quotes are added." : "Estimated budget is not available in current knowledge base.",
        "Vendor names, officer names, legal requirements, confirmed permissions, and exact rates are not invented by the mock AI provider."
      ],
      confidenceLevel: "MEDIUM",
      eventFlow: [
        "Event intake and requirement confirmation",
        "Venue, permissions, and vendor readiness check",
        "Stakeholder invitation and outreach execution",
        "Event-day setup, guest movement, programming, and issue desk",
        "Post-event documentation, budget reconciliation, and learning capture"
      ],
      logisticsChecklist: [
        "Confirm venue access timing and setup window.",
        "Create entry, registration, backstage, vendor, and emergency contact checklist.",
        "Confirm power, sound, light, seating, signage, drinking water, and movement routes.",
        "Prepare event-day communication group and escalation path.",
        "Keep permissions and vendor quotations attached in the Files tab."
      ],
      manpowerPlan: buildManpowerPlan(input.scaleTier, pax),
      mediaCoveragePlan: [
        "Capture pre-event setup, main proceedings, audience moments, sponsor/stakeholder visibility, and closing moments.",
        "Prepare press note or social summary after confirmation of final numbers and quotes.",
        "Do not publish official claims until approved by the event owner."
      ],
      minuteToMinuteSchedule: buildSchedule(input),
      needsConfirmation: [
        input.venue ? "Venue access time and setup restrictions." : "Venue is not available in current knowledge base.",
        input.startsAt ? "Final run-of-show timing." : "Start date and time are not available in current knowledge base.",
        "Permissions, dignitary/protocol requirements, and official claim wording.",
        "Vendor quotes, manpower count, and emergency contacts."
      ],
      postEventReportStructure: [
        "Event overview and objectives",
        "Attendance and stakeholder participation",
        "Budget estimated vs actual",
        "Task completion and operational issues",
        "Vendor performance notes",
        "Media/content summary",
        "Learnings and reusable playbook entries"
      ],
      riskChecklist: [
        {
          mitigation: "Confirm setup buffer, vendor call times, and venue access in writing.",
          needsConfirmation: true,
          risk: "Setup delay"
        },
        {
          mitigation: "Keep alternate communication channel and emergency contact list ready.",
          needsConfirmation: true,
          risk: "On-ground coordination gaps"
        },
        {
          mitigation: "Track actual spends in Budget tab and require approval before overrun.",
          needsConfirmation: false,
          risk: "Budget overrun"
        },
        {
          mitigation: "Use approved messaging only for press, sponsors, government, and public claims.",
          needsConfirmation: true,
          risk: "Unapproved external communication"
        }
      ],
      schemaVersion: "campaignops.eventPlan.v1",
      sourcesUsed: ["Current event record", "CampaignOps locked event taxonomy", "Mock provider operational template"],
      stageStallRequirements: [
        "Backdrop or event identity placement based on brand context.",
        "Registration or help desk table if audience movement needs control.",
        "Stage seating, mic count, and display requirements must be confirmed from final flow.",
        "Directional signage and sponsor/stakeholder visibility only after approval."
      ],
      strategySummary: `${input.title} should be run as a ${input.subtype} under ${formatEnum(input.category)} for ${formatEnum(input.scaleTier)} scale. ${scaleNote} The plan should prioritize clear ownership, vendor readiness, stakeholder communication, and post-event learning capture.`,
      vendorRequirements: buildVendorRequirements(input.scaleTier),
      workflowType: "EVENT_PLAN",
      knownFromProvidedData: [
        `Title: ${input.title}`,
        `Type: ${formatEnum(input.category)}`,
        `Subtype: ${input.subtype}`,
        `Scale tier: ${formatEnum(input.scaleTier)}`,
        `City: ${input.city ?? "Not available in current knowledge base."}`,
        `Venue: ${input.venue ?? "Not available in current knowledge base."}`,
        `Expected pax: ${input.expectedPax ?? "Not available in current knowledge base."}`,
        `Budget: ${budget ? `INR ${budget}` : "Not available in current knowledge base."}`,
        `Objective: ${input.objective ?? "Not available in current knowledge base."}`,
        `Stakeholders: ${stakeholders.length ? stakeholders.join(", ") : "Not available in current knowledge base."}`
      ]
    };
  }
}

function buildManpowerPlan(scaleTier: string, pax: number): EventPlanOutput["manpowerPlan"] {
  const baseCount = scaleTier === "MASS" || pax > 2000 ? 18 : scaleTier === "LARGE" || pax > 500 ? 12 : scaleTier === "MEDIUM" || pax > 100 ? 8 : 4;

  return [
    { count: 1, notes: "Single owner for event decisions and escalation.", role: "Event lead" },
    { count: Math.max(1, Math.ceil(baseCount / 4)), notes: "Vendor coordination, setup checks, issue escalation.", role: "Operations coordinators" },
    { count: Math.max(1, Math.ceil(baseCount / 5)), notes: "Registration, guest flow, stakeholder assistance.", role: "Guest / registration team" },
    { count: Math.max(1, Math.ceil(baseCount / 6)), notes: "Content capture, media coordination, documentation.", role: "Media / content team" },
    { count: Math.max(1, Math.ceil(baseCount / 6)), notes: "Budget entries, bills, permissions, file collection.", role: "Documentation support" }
  ];
}

function buildSchedule(input: GenerateEventPlanInput): EventPlanOutput["minuteToMinuteSchedule"] {
  return [
    { activity: "Team arrival, setup handover, vendor readiness check", owner: "Operations lead", time: "T-180 min" },
    { activity: "Registration/help desk setup and signage check", owner: "Guest team", time: "T-120 min" },
    { activity: "Sound, light, display, seating, and stage/stall rehearsal", owner: "Vendor coordinator", time: "T-90 min" },
    { activity: "Stakeholder arrival window and briefing", owner: "Event lead", time: "T-45 min" },
    { activity: `Main ${input.subtype} program flow`, owner: "Event lead", time: "T+0 min" },
    { activity: "Audience engagement, media capture, vendor issue monitoring", owner: "Operations team", time: "During event" },
    { activity: "Closing, acknowledgements, teardown, bills/files collection", owner: "Documentation support", time: "Post-event" }
  ];
}

function buildVendorRequirements(scaleTier: string): EventPlanOutput["vendorRequirements"] {
  const requirements: EventPlanOutput["vendorRequirements"] = [
    { category: "VENUE", notes: "Confirm access timing, capacity, power, parking, restrictions.", requirement: "Venue readiness" },
    { category: "SOUND", notes: "Mic count and speaker setup should match final run-of-show.", requirement: "Sound setup" },
    { category: "LIGHT", notes: "Required if event has stage, evening timing, or media capture.", requirement: "Lighting setup" },
    { category: "PRINTING", notes: "Directional signage, standees, badges, or posters as needed.", requirement: "Printing and branding" },
    { category: "PHOTOGRAPHY", notes: "Capture setup, proceedings, stakeholders, and closing.", requirement: "Photo documentation" }
  ];

  if (["MEDIUM", "LARGE", "MASS"].includes(scaleTier)) {
    requirements.push(
      { category: "SECURITY", notes: "Crowd movement, entry control, and emergency route support.", requirement: "Security / crowd support" },
      { category: "REGISTRATION", notes: "Registration desk, QR/list/manual fallback as appropriate.", requirement: "Registration support" }
    );
  }

  return requirements;
}

function scaleToOperationsNote(scaleTier: string, pax: number) {
  if (scaleTier === "MASS" || pax > 2000) {
    return "This needs crowd movement planning, layered vendor ownership, and strong escalation paths.";
  }

  if (scaleTier === "LARGE" || pax > 500) {
    return "This needs clear zone ownership, vendor buffers, and sponsor/stakeholder visibility checks.";
  }

  if (scaleTier === "MEDIUM" || pax > 100) {
    return "This needs disciplined task tracking, registration planning, and vendor readiness checks.";
  }

  return "This can run with a lean team if ownership, setup timing, and communication are tight.";
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}
