import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AIOutputType,
  AIWorkflowStatus,
  AIWorkflowType,
  BudgetCategory,
  OutreachRecipientType,
  PaymentStatus,
  Prisma,
  TaskPriority
} from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateAiOutputDto } from "./dto/update-ai-output.dto";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Injectable()
export class AiService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly mockAiProvider: MockAiProvider,
    private readonly prisma: PrismaService
  ) {}

  async listOutputs(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.aIOutput.findMany({
      where: {
        eventId
      },
      include: this.aiOutputInclude,
      orderBy: [{ isAccepted: "desc" }, { updatedAt: "desc" }]
    });
  }

  async generateEventPlan(eventId: string, user: AuthenticatedUser) {
    const event = await this.getEventForAi(eventId, user.organizationId);
    const playbookContext = await this.getPlaybookContextForEvent(event);
    const inputJson = {
      brandContext: event.brandContext,
      budget: event.estimatedBudgetAmount ? Number(event.estimatedBudgetAmount) : null,
      category: event.category,
      city: event.city,
      departmentOrClient: event.departmentOrClient,
      endsAt: event.endsAt?.toISOString() ?? null,
      expectedPax: event.expectedPax,
      objective: event.objective,
      scaleTier: event.scaleTier,
      stakeholders: event.stakeholdersJson,
      startsAt: event.startsAt?.toISOString() ?? null,
      subtype: event.subtype,
      title: event.title,
      venue: event.venue,
      playbookEntryCount: playbookContext.entries.length
    } as Prisma.InputJsonObject;

    const outputJson = await this.mockAiProvider.generateEventPlan({
      ...event,
      playbookContext
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const workflowRun = await tx.aIWorkflowRun.create({
        data: {
          createdById: user.sub,
          eventId,
          inputJson,
          modelUsed: "mock-ai-provider-v1",
          organizationId: user.organizationId,
          outputJson: outputJson as unknown as Prisma.InputJsonValue,
          retrievedContextJson: playbookContext as unknown as Prisma.InputJsonValue,
          status: AIWorkflowStatus.COMPLETED,
          workflowType: AIWorkflowType.EVENT_PLAN
        }
      });

      const output = await tx.aIOutput.create({
        data: {
          createdById: user.sub,
          eventId,
          outputType: AIOutputType.EVENT_PLAN,
          responseJson: outputJson as unknown as Prisma.InputJsonValue,
          title: `Mock AI Event Plan - ${event.title}`
        },
        include: this.aiOutputInclude
      });

      return { output, workflowRun };
    });

    await this.activityService.record({
      action: "AI_OUTPUT_GENERATED",
      entityId: result.output.id,
      entityType: "AIOutput",
      eventId,
      metadata: {
        outputType: result.output.outputType,
        playbookEntryCount: playbookContext.entries.length,
        title: result.output.title,
        workflowType: AIWorkflowType.EVENT_PLAN
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return result;
  }

  async updateOutput(eventId: string, outputId: string, user: AuthenticatedUser, updateAiOutputDto: UpdateAiOutputDto) {
    await this.assertOutputAccess(eventId, outputId, user.organizationId);

    const output = await this.prisma.aIOutput.update({
      where: { id: outputId },
      data: {
        responseJson:
          updateAiOutputDto.responseJson === undefined
            ? undefined
            : (updateAiOutputDto.responseJson as Prisma.InputJsonObject),
        title: updateAiOutputDto.title
      },
      include: this.aiOutputInclude
    });

    await this.activityService.record({
      action: "AI_OUTPUT_UPDATED",
      entityId: output.id,
      entityType: "AIOutput",
      eventId,
      metadata: {
        outputType: output.outputType,
        title: output.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return output;
  }

  async acceptOutput(eventId: string, outputId: string, user: AuthenticatedUser) {
    await this.assertOutputAccess(eventId, outputId, user.organizationId);

    const output = await this.prisma.aIOutput.update({
      where: { id: outputId },
      data: { isAccepted: true },
      include: this.aiOutputInclude
    });

    await this.activityService.record({
      action: "AI_OUTPUT_ACCEPTED",
      entityId: output.id,
      entityType: "AIOutput",
      eventId,
      metadata: {
        outputType: output.outputType,
        title: output.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return output;
  }

  async convertOutputToTasks(eventId: string, outputId: string, user: AuthenticatedUser) {
    const output = await this.getApprovedEventPlanOutput(eventId, outputId, user.organizationId, "tasks");
    await this.assertOutputNotConverted(eventId, output.id, user.organizationId, "AI_OUTPUT_CONVERTED_TO_TASKS", "tasks");

    const taskDrafts = buildTaskDraftsFromEventPlan(output.responseJson).slice(0, 20);

    if (!taskDrafts.length) {
      throw new BadRequestException("This AI output does not contain task-ready event plan sections.");
    }

    const tasks = await this.prisma.$transaction(async (tx) => {
      const createdTasks = await Promise.all(
        taskDrafts.map((taskDraft) =>
          tx.task.create({
            data: {
              checklistJson: taskDraft.checklist?.length
                ? (taskDraft.checklist as Prisma.InputJsonArray)
                : undefined,
              createdById: user.sub,
              eventId,
              notes: taskDraft.notes,
              priority: taskDraft.priority,
              title: taskDraft.title
            },
            include: this.taskInclude
          })
        )
      );

      await tx.activityLog.create({
        data: {
          action: "AI_OUTPUT_CONVERTED_TO_TASKS",
          entityId: output.id,
          entityType: "AIOutput",
          eventId,
          metadataJson: {
            outputTitle: output.title,
            taskCount: createdTasks.length
          },
          organizationId: user.organizationId,
          userId: user.sub
        }
      });

      return createdTasks;
    });

    return {
      convertedCount: tasks.length,
      tasks
    };
  }

  async convertOutputToBudget(eventId: string, outputId: string, user: AuthenticatedUser) {
    const output = await this.getApprovedEventPlanOutput(eventId, outputId, user.organizationId, "budget items");
    await this.assertOutputNotConverted(eventId, output.id, user.organizationId, "AI_OUTPUT_CONVERTED_TO_BUDGET", "budget items");

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId
      },
      select: {
        estimatedBudgetAmount: true,
        expectedPax: true,
        scaleTier: true,
        title: true
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const budgetDrafts = buildBudgetDraftsFromEventPlan(
      output.responseJson,
      event.estimatedBudgetAmount ? Number(event.estimatedBudgetAmount) : 0
    ).slice(0, 14);

    if (!budgetDrafts.length) {
      throw new BadRequestException("This AI output does not contain budget-ready event plan sections.");
    }

    const budgetItems = await this.prisma.$transaction(async (tx) => {
      const createdBudgetItems = await Promise.all(
        budgetDrafts.map((budgetDraft) =>
          tx.budgetItem.create({
            data: {
              actualAmount: new Prisma.Decimal(0),
              category: budgetDraft.category,
              estimatedAmount: new Prisma.Decimal(budgetDraft.estimatedAmount),
              eventId,
              notes: budgetDraft.notes,
              paymentStatus: PaymentStatus.NOT_STARTED,
              title: budgetDraft.title
            },
            include: this.budgetItemInclude
          })
        )
      );

      await tx.activityLog.create({
        data: {
          action: "AI_OUTPUT_CONVERTED_TO_BUDGET",
          entityId: output.id,
          entityType: "AIOutput",
          eventId,
          metadataJson: {
            budgetItemCount: createdBudgetItems.length,
            outputTitle: output.title
          },
          organizationId: user.organizationId,
          userId: user.sub
        }
      });

      return createdBudgetItems;
    });

    return {
      budgetItems,
      convertedCount: budgetItems.length
    };
  }

  async convertOutputToOutreach(eventId: string, outputId: string, user: AuthenticatedUser) {
    const output = await this.getApprovedEventPlanOutput(eventId, outputId, user.organizationId, "outreach drafts");
    await this.assertOutputNotConverted(eventId, output.id, user.organizationId, "AI_OUTPUT_CONVERTED_TO_OUTREACH", "outreach drafts");

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId: user.organizationId
      },
      select: {
        departmentOrClient: true,
        title: true
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    const outreachDrafts = buildOutreachDraftsFromEventPlan(output.responseJson, event.title, event.departmentOrClient).slice(0, 6);

    if (!outreachDrafts.length) {
      throw new BadRequestException("This AI output does not contain outreach-ready event plan sections.");
    }

    const templates = await this.prisma.$transaction(async (tx) => {
      const createdTemplates = await Promise.all(
        outreachDrafts.map((outreachDraft) =>
          tx.outreachTemplate.create({
            data: {
              body: outreachDraft.body,
              channel: outreachDraft.channel,
              createdById: user.sub,
              eventId,
              organizationId: user.organizationId,
              recipientType: outreachDraft.recipientType,
              title: outreachDraft.title
            },
            include: this.outreachTemplateInclude
          })
        )
      );

      await tx.activityLog.create({
        data: {
          action: "AI_OUTPUT_CONVERTED_TO_OUTREACH",
          entityId: output.id,
          entityType: "AIOutput",
          eventId,
          metadataJson: {
            outputTitle: output.title,
            outreachDraftCount: createdTemplates.length
          },
          organizationId: user.organizationId,
          userId: user.sub
        }
      });

      return createdTemplates;
    });

    return {
      convertedCount: templates.length,
      templates
    };
  }

  private async getApprovedEventPlanOutput(eventId: string, outputId: string, organizationId: string, target: string) {
    const output = await this.prisma.aIOutput.findFirst({
      where: {
        event: {
          organizationId
        },
        eventId,
        id: outputId
      },
      select: {
        id: true,
        isAccepted: true,
        outputType: true,
        responseJson: true,
        title: true
      }
    });

    if (!output) {
      throw new NotFoundException("AI output not found.");
    }

    if (output.outputType !== AIOutputType.EVENT_PLAN) {
      throw new BadRequestException(`Only approved event plan outputs can be converted to ${target}.`);
    }

    if (!output.isAccepted) {
      throw new BadRequestException(`Approve the AI output before converting it to ${target}.`);
    }

    return output;
  }

  private async assertOutputNotConverted(
    eventId: string,
    outputId: string,
    organizationId: string,
    action: string,
    target: string
  ) {
    const existingConversion = await this.prisma.activityLog.findFirst({
      where: {
        action,
        entityId: outputId,
        eventId,
        organizationId
      },
      select: { id: true }
    });

    if (existingConversion) {
      throw new ConflictException(`This AI output has already been converted to ${target}.`);
    }
  }

  private async assertEventAccess(eventId: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId
      },
      select: { id: true }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }
  }

  private async assertOutputAccess(eventId: string, outputId: string, organizationId: string) {
    const output = await this.prisma.aIOutput.findFirst({
      where: {
        event: {
          organizationId
        },
        eventId,
        id: outputId
      },
      select: { id: true }
    });

    if (!output) {
      throw new NotFoundException("AI output not found.");
    }
  }

  private async getEventForAi(eventId: string, organizationId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        organizationId
      }
    });

    if (!event) {
      throw new NotFoundException("Event not found.");
    }

    return event;
  }

  private async getPlaybookContextForEvent(event: Awaited<ReturnType<AiService["getEventForAi"]>>) {
    const playbookEntries = await this.prisma.playbookEntry.findMany({
      where: {
        eventId: {
          not: event.id
        },
        eventType: event.category,
        organizationId: event.organizationId,
        scale: event.scaleTier
      },
      orderBy: [
        {
          city: event.city ? "desc" : "asc"
        },
        {
          updatedAt: "desc"
        }
      ],
      take: 3
    });

    const cityMatchedEntries = event.city
      ? [
          ...playbookEntries.filter((entry) => entry.city === event.city),
          ...playbookEntries.filter((entry) => entry.city !== event.city)
        ]
      : playbookEntries;

    return {
      entries: cityMatchedEntries.slice(0, 3).map((entry) => ({
        budgetRange: entry.budgetRange,
        city: entry.city,
        createdAt: entry.createdAt.toISOString(),
        eventId: entry.eventId,
        learnings: readLearningJson(entry.learningsJson),
        riskNotes: readNotesJson(entry.riskNotesJson),
        scale: entry.scale,
        vendorNotes: readNotesJson(entry.vendorNotesJson)
      }))
    };
  }

  private readonly aiOutputInclude = {
    createdBy: {
      select: {
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.AIOutputInclude;

  private readonly taskInclude = {
    assignee: {
      select: {
        id: true,
        name: true,
        email: true
      }
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  } satisfies Prisma.TaskInclude;

  private readonly budgetItemInclude = {
    vendor: {
      select: {
        category: true,
        id: true,
        name: true,
        paymentStatus: true
      }
    }
  } satisfies Prisma.BudgetItemInclude;

  private readonly outreachTemplateInclude = {
    createdBy: {
      select: {
        email: true,
        id: true,
        name: true
      }
    }
  } satisfies Prisma.OutreachTemplateInclude;
}

type TaskDraft = {
  checklist?: string[];
  notes?: string;
  priority: TaskPriority;
  title: string;
};

type BudgetDraft = {
  category: BudgetCategory;
  estimatedAmount: number;
  notes: string;
  title: string;
};

type OutreachDraft = {
  body: string;
  channel: string;
  recipientType: OutreachRecipientType;
  title: string;
};

function buildTaskDraftsFromEventPlan(responseJson: Prisma.JsonValue): TaskDraft[] {
  if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
    return [];
  }

  const eventPlan = responseJson as Record<string, unknown>;
  const tasks: TaskDraft[] = [];

  tasks.push(
    ...stringList(eventPlan.eventFlow).map((item, index) => ({
      notes: "Converted from the approved AI event flow. Review owner and due date before execution.",
      priority: index < 2 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
      title: `Plan phase ${index + 1}: ${item}`
    }))
  );

  const logisticsChecklist = stringList(eventPlan.logisticsChecklist);
  if (logisticsChecklist.length) {
    tasks.push({
      checklist: logisticsChecklist,
      notes: "Converted from the approved AI logistics checklist.",
      priority: TaskPriority.HIGH,
      title: "Confirm logistics readiness"
    });
  }

  for (const vendorRequirement of objectList(eventPlan.vendorRequirements)) {
    const category = textValue(vendorRequirement.category, "Vendor");
    const requirement = textValue(vendorRequirement.requirement, "Vendor requirement");
    const notes = textValue(vendorRequirement.notes, "");

    tasks.push({
      notes: notes ? `${category}: ${notes}` : `Confirm ${category.toLowerCase()} requirement before event execution.`,
      priority: TaskPriority.HIGH,
      title: `Confirm ${requirement}`
    });
  }

  for (const risk of objectList(eventPlan.riskChecklist)) {
    const riskName = textValue(risk.risk, "Operational risk");
    const mitigation = textValue(risk.mitigation, "Confirm mitigation plan.");
    const needsConfirmation = risk.needsConfirmation === true;

    tasks.push({
      checklist: needsConfirmation ? ["Confirm risk owner", "Confirm mitigation", "Update event team"] : undefined,
      notes: mitigation,
      priority: needsConfirmation ? TaskPriority.URGENT : TaskPriority.HIGH,
      title: `Mitigate risk: ${riskName}`
    });
  }

  const needsConfirmation = stringList(eventPlan.needsConfirmation);
  if (needsConfirmation.length) {
    tasks.push({
      checklist: needsConfirmation,
      notes: "Converted from AI items marked as needing human confirmation.",
      priority: TaskPriority.HIGH,
      title: "Resolve AI plan confirmations"
    });
  }

  const reportStructure = stringList(eventPlan.postEventReportStructure);
  if (reportStructure.length) {
    tasks.push({
      checklist: reportStructure,
      notes: "Prepare reporting inputs during and after event execution.",
      priority: TaskPriority.LOW,
      title: "Prepare post-event report structure"
    });
  }

  return tasks.filter((task) => task.title.trim().length > 0);
}

function buildBudgetDraftsFromEventPlan(responseJson: Prisma.JsonValue, estimatedBudgetAmount: number): BudgetDraft[] {
  if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
    return [];
  }

  const eventPlan = responseJson as Record<string, unknown>;
  const vendorRequirements = objectList(eventPlan.vendorRequirements);
  const logisticsChecklist = stringList(eventPlan.logisticsChecklist);
  const stageStallRequirements = stringList(eventPlan.stageStallRequirements);
  const mediaCoveragePlan = stringList(eventPlan.mediaCoveragePlan);
  const baseAmount = Math.max(0, Math.round(estimatedBudgetAmount));
  const drafts: BudgetDraft[] = [];

  for (const vendorRequirement of vendorRequirements) {
    const category = textValue(vendorRequirement.category, "Vendor");
    const requirement = textValue(vendorRequirement.requirement, category);

    drafts.push({
      category: mapBudgetCategory(`${category} ${requirement}`),
      estimatedAmount: 0,
      notes: "AI draft from approved vendor requirement. Review vendor quote and final amount before execution.",
      title: requirement
    });
  }

  if (stageStallRequirements.length) {
    drafts.push({
      category: BudgetCategory.STAGE,
      estimatedAmount: 0,
      notes: `AI draft from stage/stall requirements: ${stageStallRequirements.slice(0, 4).join(", ")}.`,
      title: "Stage and setup requirements"
    });
  }

  if (mediaCoveragePlan.length) {
    drafts.push({
      category: BudgetCategory.PHOTOGRAPHY,
      estimatedAmount: 0,
      notes: `AI draft from media coverage plan: ${mediaCoveragePlan.slice(0, 4).join(", ")}.`,
      title: "Media coverage and documentation"
    });
  }

  if (logisticsChecklist.length) {
    drafts.push({
      category: BudgetCategory.MISCELLANEOUS,
      estimatedAmount: 0,
      notes: `AI draft from logistics checklist: ${logisticsChecklist.slice(0, 5).join(", ")}.`,
      title: "Logistics readiness reserve"
    });
  }

  const uniqueDrafts = dedupeBudgetDrafts(drafts);

  if (!baseAmount || !uniqueDrafts.length) {
    return uniqueDrafts;
  }

  const weightedDrafts = uniqueDrafts.map((draft) => ({
    ...draft,
    weight: budgetWeightForCategory(draft.category)
  }));
  const totalWeight = weightedDrafts.reduce((sum, draft) => sum + draft.weight, 0);

  return weightedDrafts.map(({ weight, ...draft }) => ({
    ...draft,
    estimatedAmount: roundToNearestHundred((baseAmount * weight) / totalWeight),
    notes: `${draft.notes} Amount is an initial AI allocation from the event estimate and must be human-reviewed.`
  }));
}

function buildOutreachDraftsFromEventPlan(
  responseJson: Prisma.JsonValue,
  eventTitle: string,
  departmentOrClient: string | null
): OutreachDraft[] {
  if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
    return [];
  }

  const eventPlan = responseJson as Record<string, unknown>;
  const strategySummary = textValue(eventPlan.strategySummary, `We are planning ${eventTitle}.`);
  const eventFlow = stringList(eventPlan.eventFlow);
  const mediaCoveragePlan = stringList(eventPlan.mediaCoveragePlan);
  const vendorRequirements = objectList(eventPlan.vendorRequirements);
  const contextLine = departmentOrClient ? `The event context is ${departmentOrClient}.` : "The event context will be shared after confirmation.";
  const flowLine = eventFlow.length ? `Planned flow: ${eventFlow.slice(0, 3).join("; ")}.` : "";
  const drafts: OutreachDraft[] = [
    {
      body: `Dear Partner,\n\nWe are preparing ${eventTitle}. ${contextLine}\n\n${strategySummary}\n\n${flowLine}\n\nWe would like to explore partnership fit, support scope, and next steps.\n\nRegards,\nCampaignOps Team`,
      channel: "EMAIL",
      recipientType: OutreachRecipientType.SPONSOR,
      title: `Sponsor outreach - ${eventTitle}`
    },
    {
      body: `Dear Guest,\n\nWe would be pleased to invite you to ${eventTitle}. ${contextLine}\n\n${strategySummary}\n\nFurther details, schedule, and participation context will be shared after confirmation.\n\nRegards,\nCampaignOps Team`,
      channel: "EMAIL",
      recipientType: OutreachRecipientType.SPEAKER,
      title: `Guest invitation - ${eventTitle}`
    }
  ];

  if (mediaCoveragePlan.length) {
    drafts.push({
      body: `Dear Media Team,\n\nWe are planning ${eventTitle} and want to coordinate media coverage for the event.\n\nCoverage priorities: ${mediaCoveragePlan.slice(0, 4).join("; ")}.\n\nPlease let us know availability, coverage requirements, and coordination details.\n\nRegards,\nCampaignOps Team`,
      channel: "EMAIL",
      recipientType: OutreachRecipientType.MEDIA,
      title: `Media outreach - ${eventTitle}`
    });
  }

  if (vendorRequirements.length) {
    const requirementSummary = vendorRequirements
      .slice(0, 5)
      .map((vendorRequirement) => textValue(vendorRequirement.requirement, textValue(vendorRequirement.category, "Vendor support")))
      .join("; ");

    drafts.push({
      body: `Dear Vendor Partner,\n\nWe are preparing ${eventTitle} and collecting availability and quotations for required event support.\n\nCurrent requirements: ${requirementSummary}.\n\nPlease share availability, scope, quotation, and any setup requirements.\n\nRegards,\nCampaignOps Team`,
      channel: "EMAIL",
      recipientType: OutreachRecipientType.VENDOR,
      title: `Vendor quotation request - ${eventTitle}`
    });
  }

  return drafts;
}

function dedupeBudgetDrafts(drafts: BudgetDraft[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = `${draft.category}:${draft.title.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mapBudgetCategory(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("venue")) return BudgetCategory.VENUE;
  if (normalized.includes("food") || normalized.includes("catering")) return BudgetCategory.FOOD;
  if (normalized.includes("print")) return BudgetCategory.PRINTING;
  if (normalized.includes("brand") || normalized.includes("standee") || normalized.includes("banner")) return BudgetCategory.BRANDING;
  if (normalized.includes("stage") || normalized.includes("stall") || normalized.includes("fabrication")) return BudgetCategory.STAGE;
  if (normalized.includes("sound") || normalized.includes("audio")) return BudgetCategory.SOUND;
  if (normalized.includes("light")) return BudgetCategory.LIGHTING;
  if (normalized.includes("travel") || normalized.includes("transport")) return BudgetCategory.TRAVEL;
  if (normalized.includes("photo")) return BudgetCategory.PHOTOGRAPHY;
  if (normalized.includes("video")) return BudgetCategory.VIDEOGRAPHY;
  if (normalized.includes("guest") || normalized.includes("hospitality")) return BudgetCategory.GUEST_HOSPITALITY;
  if (normalized.includes("team") || normalized.includes("manpower") || normalized.includes("volunteer")) return BudgetCategory.TEAM;
  return BudgetCategory.VENDOR_PAYMENTS;
}

function budgetWeightForCategory(category: BudgetCategory) {
  const weights: Record<BudgetCategory, number> = {
    ADS: 6,
    BRANDING: 7,
    FOOD: 14,
    GUEST_HOSPITALITY: 8,
    LIGHTING: 7,
    MISCELLANEOUS: 6,
    PHOTOGRAPHY: 5,
    PRINTING: 5,
    SOUND: 8,
    STAGE: 10,
    TEAM: 7,
    TRAVEL: 7,
    VENDOR_PAYMENTS: 8,
    VENUE: 12,
    VIDEOGRAPHY: 5
  };

  return weights[category];
}

function roundToNearestHundred(value: number) {
  return Math.max(0, Math.round(value / 100) * 100);
}

function readLearningJson(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      reusableChecklist: [],
      summary: "",
      whatToImprove: [],
      whatWorked: []
    };
  }

  const record = value as Record<string, unknown>;

  return {
    reusableChecklist: stringList(record.reusableChecklist),
    summary: textValue(record.summary, ""),
    whatToImprove: stringList(record.whatToImprove),
    whatWorked: stringList(record.whatWorked)
  };
}

function readNotesJson(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  return stringList(record.notes);
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function objectList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => {
    return !!item && typeof item === "object" && !Array.isArray(item);
  });
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
