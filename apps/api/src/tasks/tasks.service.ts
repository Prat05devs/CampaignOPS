import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TaskStatus } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser, filters: { status?: TaskStatus }) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.task.findMany({
      where: {
        eventId,
        status: filters.status
      },
      include: this.taskInclude,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }]
    });
  }

  async listAcrossEvents(user: AuthenticatedUser, filters: { status?: TaskStatus }) {
    return this.prisma.task.findMany({
      where: {
        event: {
          organizationId: user.organizationId
        },
        status: filters.status
      },
      include: this.globalTaskInclude,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 250
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createTaskDto: CreateTaskDto) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertAssigneeAccess(createTaskDto.assigneeId, user.organizationId);

    const { checklist, ...data } = createTaskDto;

    const task = await this.prisma.task.create({
      data: {
        ...data,
        eventId,
        createdById: user.sub,
        checklistJson: checklist?.length ? checklist : undefined
      },
      include: this.taskInclude
    });

    await this.activityService.record({
      action: "TASK_CREATED",
      entityId: task.id,
      entityType: "Task",
      eventId,
      metadata: {
        priority: task.priority,
        status: task.status,
        title: task.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return task;
  }

  async update(eventId: string, taskId: string, user: AuthenticatedUser, updateTaskDto: UpdateTaskDto) {
    await this.assertEventAccess(eventId, user.organizationId);
    const existingTask = await this.assertTaskAccess(eventId, taskId);
    await this.assertAssigneeAccess(updateTaskDto.assigneeId, user.organizationId);

    const { checklist, ...data } = updateTaskDto;

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        checklistJson: checklist === undefined ? undefined : checklist
      },
      include: this.taskInclude
    });

    await this.activityService.record({
      action: updateTaskDto.status && updateTaskDto.status !== existingTask.status ? "TASK_STATUS_CHANGED" : "TASK_UPDATED",
      entityId: task.id,
      entityType: "Task",
      eventId,
      metadata: {
        previousStatus: existingTask.status,
        status: task.status,
        title: task.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return task;
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

  private async assertTaskAccess(eventId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        eventId
      },
      select: { id: true, status: true }
    });

    if (!task) {
      throw new NotFoundException("Task not found.");
    }
    return task;
  }

  private async assertAssigneeAccess(assigneeId: string | undefined, organizationId: string) {
    if (!assigneeId) {
      return;
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: assigneeId
      },
      select: { id: true }
    });

    if (!membership) {
      throw new NotFoundException("Assignee not found.");
    }
  }

  private readonly taskInclude = {
    assignee: {
      select: {
        avatarUrl: true,
        id: true,
        name: true,
        email: true
      }
    },
    createdBy: {
      select: {
        avatarUrl: true,
        id: true,
        name: true,
        email: true
      }
    }
  } satisfies Prisma.TaskInclude;

  private readonly globalTaskInclude = {
    assignee: {
      select: {
        avatarUrl: true,
        id: true,
        name: true,
        email: true
      }
    },
    createdBy: {
      select: {
        avatarUrl: true,
        id: true,
        name: true,
        email: true
      }
    },
    event: {
      select: {
        category: true,
        id: true,
        scaleTier: true,
        status: true,
        title: true
      }
    }
  } satisfies Prisma.TaskInclude;
}
