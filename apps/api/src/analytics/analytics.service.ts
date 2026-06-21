import { Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, PaymentStatus, TaskStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: AuthenticatedUser) {
    const now = new Date();
    const upcomingWindowEnd = addDays(now, 7);

    const [
      activeEvents,
      openTasks,
      contacts,
      vendors,
      eventBudgetAggregate,
      upcomingDeadlines,
      overdueTasks,
      budgetItems,
      recentActivity
    ] = await Promise.all([
      this.prisma.event.count({
        where: {
          organizationId: user.organizationId,
          status: { notIn: [EventStatus.CANCELLED, EventStatus.COMPLETED] }
        }
      }),
      this.prisma.task.count({
        where: {
          event: { organizationId: user.organizationId },
          status: { not: TaskStatus.DONE }
        }
      }),
      this.prisma.contact.count({ where: { organizationId: user.organizationId } }),
      this.prisma.vendor.count({ where: { organizationId: user.organizationId } }),
      this.prisma.event.aggregate({
        _sum: { estimatedBudgetAmount: true },
        where: { organizationId: user.organizationId }
      }),
      this.prisma.task.count({
        where: {
          dueAt: {
            gte: now,
            lte: upcomingWindowEnd
          },
          event: { organizationId: user.organizationId },
          status: { not: TaskStatus.DONE }
        }
      }),
      this.prisma.task.count({
        where: {
          dueAt: { lt: now },
          event: { organizationId: user.organizationId },
          status: { not: TaskStatus.DONE }
        }
      }),
      this.prisma.budgetItem.findMany({
        where: {
          event: { organizationId: user.organizationId }
        },
        select: {
          actualAmount: true,
          estimatedAmount: true,
          paymentStatus: true
        }
      }),
      this.prisma.activityLog.findMany({
        where: { organizationId: user.organizationId },
        include: {
          user: {
            select: {
              avatarUrl: true,
              email: true,
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    return {
      activeEvents,
      budgetAlerts: countBudgetAlerts(budgetItems),
      contacts,
      openTasks,
      overdueTasks,
      recentActivity,
      totalBudgetTracked: toNumber(eventBudgetAggregate._sum.estimatedBudgetAmount),
      upcomingDeadlines,
      vendors
    };
  }

  async eventAnalytics(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    const now = new Date();
    const upcomingWindowEnd = addDays(now, 7);

    const [
      tasks,
      budgetItems,
      contacts,
      vendors,
      files,
      outreachDrafts,
      recentActivity
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: { eventId },
        select: {
          dueAt: true,
          status: true
        }
      }),
      this.prisma.budgetItem.findMany({
        where: { eventId },
        select: {
          actualAmount: true,
          estimatedAmount: true,
          paymentStatus: true
        }
      }),
      this.prisma.eventContact.count({ where: { eventId } }),
      this.prisma.eventVendor.count({ where: { eventId } }),
      this.prisma.fileAsset.count({ where: { eventId } }),
      this.prisma.outreachTemplate.count({ where: { eventId } }),
      this.prisma.activityLog.findMany({
        where: {
          eventId,
          organizationId: user.organizationId
        },
        include: {
          user: {
            select: {
              avatarUrl: true,
              email: true,
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    const taskSummary = summarizeTasks(tasks, now, upcomingWindowEnd);
    const budgetSummary = summarizeBudget(budgetItems);

    return {
      budget: budgetSummary,
      contacts,
      files,
      outreachDrafts,
      recentActivity,
      tasks: taskSummary,
      vendors
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
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function countBudgetAlerts(items: Array<{ actualAmount: unknown; estimatedAmount: unknown; paymentStatus: PaymentStatus }>) {
  return items.filter((item) => {
    return item.paymentStatus === PaymentStatus.OVERDUE || toNumber(item.actualAmount) > toNumber(item.estimatedAmount);
  }).length;
}

function summarizeBudget(items: Array<{ actualAmount: unknown; estimatedAmount: unknown; paymentStatus: PaymentStatus }>) {
  const estimated = items.reduce((sum, item) => sum + toNumber(item.estimatedAmount), 0);
  const actual = items.reduce((sum, item) => sum + toNumber(item.actualAmount), 0);

  return {
    actual,
    alerts: countBudgetAlerts(items),
    estimated,
    overduePayments: items.filter((item) => item.paymentStatus === PaymentStatus.OVERDUE).length,
    remaining: estimated - actual,
    variance: actual - estimated
  };
}

function summarizeTasks(tasks: Array<{ dueAt: Date | null; status: TaskStatus }>, now: Date, upcomingWindowEnd: Date) {
  const done = tasks.filter((task) => task.status === TaskStatus.DONE).length;
  const open = tasks.length - done;
  const overdue = tasks.filter((task) => task.status !== TaskStatus.DONE && task.dueAt && task.dueAt < now).length;
  const upcoming = tasks.filter((task) => {
    return task.status !== TaskStatus.DONE && task.dueAt && task.dueAt >= now && task.dueAt <= upcomingWindowEnd;
  }).length;

  return {
    blocked: tasks.filter((task) => task.status === TaskStatus.BLOCKED).length,
    completionPercent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    done,
    open,
    overdue,
    total: tasks.length,
    upcoming
  };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}
