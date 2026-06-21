import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AIOutputType, AIWorkflowStatus, AIWorkflowType, Prisma, TaskPriority } from "@prisma/client";
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
      venue: event.venue
    } as Prisma.InputJsonObject;

    const outputJson = await this.mockAiProvider.generateEventPlan(event);

    const result = await this.prisma.$transaction(async (tx) => {
      const workflowRun = await tx.aIWorkflowRun.create({
        data: {
          createdById: user.sub,
          eventId,
          inputJson,
          modelUsed: "mock-ai-provider-v1",
          organizationId: user.organizationId,
          outputJson: outputJson as unknown as Prisma.InputJsonValue,
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
    const output = await this.prisma.aIOutput.findFirst({
      where: {
        event: {
          organizationId: user.organizationId
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
      throw new BadRequestException("Only approved event plan outputs can be converted to tasks.");
    }

    if (!output.isAccepted) {
      throw new BadRequestException("Approve the AI output before converting it to tasks.");
    }

    const existingConversion = await this.prisma.activityLog.findFirst({
      where: {
        action: "AI_OUTPUT_CONVERTED_TO_TASKS",
        entityId: output.id,
        eventId,
        organizationId: user.organizationId
      },
      select: { id: true }
    });

    if (existingConversion) {
      throw new ConflictException("This AI output has already been converted to tasks.");
    }

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
}

type TaskDraft = {
  checklist?: string[];
  notes?: string;
  priority: TaskPriority;
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
