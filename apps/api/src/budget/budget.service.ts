import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivityService } from "../activity/activity.service";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBudgetItemDto } from "./dto/create-budget-item.dto";
import { UpdateBudgetItemDto } from "./dto/update-budget-item.dto";

@Injectable()
export class BudgetService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  async list(eventId: string, user: AuthenticatedUser) {
    await this.assertEventAccess(eventId, user.organizationId);

    return this.prisma.budgetItem.findMany({
      where: { eventId },
      include: this.budgetItemInclude,
      orderBy: [{ category: "asc" }, { updatedAt: "desc" }]
    });
  }

  async create(eventId: string, user: AuthenticatedUser, createBudgetItemDto: CreateBudgetItemDto) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertVendorAccess(createBudgetItemDto.vendorId, user.organizationId);

    const { actualAmount, estimatedAmount, ...data } = createBudgetItemDto;

    const budgetItem = await this.prisma.budgetItem.create({
      data: {
        ...data,
        eventId,
        actualAmount: actualAmount === undefined ? undefined : new Prisma.Decimal(actualAmount),
        estimatedAmount: estimatedAmount === undefined ? undefined : new Prisma.Decimal(estimatedAmount)
      },
      include: this.budgetItemInclude
    });

    await this.activityService.record({
      action: "BUDGET_ITEM_CREATED",
      entityId: budgetItem.id,
      entityType: "BudgetItem",
      eventId,
      metadata: {
        category: budgetItem.category,
        paymentStatus: budgetItem.paymentStatus,
        title: budgetItem.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return budgetItem;
  }

  async update(eventId: string, budgetItemId: string, user: AuthenticatedUser, updateBudgetItemDto: UpdateBudgetItemDto) {
    await this.assertEventAccess(eventId, user.organizationId);
    await this.assertBudgetItemAccess(eventId, budgetItemId);
    await this.assertVendorAccess(updateBudgetItemDto.vendorId, user.organizationId);

    const { actualAmount, estimatedAmount, ...data } = updateBudgetItemDto;

    const budgetItem = await this.prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: {
        ...data,
        actualAmount: actualAmount === undefined ? undefined : new Prisma.Decimal(actualAmount),
        estimatedAmount: estimatedAmount === undefined ? undefined : new Prisma.Decimal(estimatedAmount)
      },
      include: this.budgetItemInclude
    });

    await this.activityService.record({
      action: updateBudgetItemDto.paymentStatus ? "BUDGET_PAYMENT_STATUS_CHANGED" : "BUDGET_ITEM_UPDATED",
      entityId: budgetItem.id,
      entityType: "BudgetItem",
      eventId,
      metadata: {
        category: budgetItem.category,
        paymentStatus: budgetItem.paymentStatus,
        title: budgetItem.title
      },
      organizationId: user.organizationId,
      userId: user.sub
    });

    return budgetItem;
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

  private async assertBudgetItemAccess(eventId: string, budgetItemId: string) {
    const budgetItem = await this.prisma.budgetItem.findFirst({
      where: {
        id: budgetItemId,
        eventId
      },
      select: { id: true }
    });

    if (!budgetItem) {
      throw new NotFoundException("Budget item not found.");
    }
  }

  private async assertVendorAccess(vendorId: string | undefined, organizationId: string) {
    if (!vendorId) {
      return;
    }

    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id: vendorId,
        organizationId
      },
      select: { id: true }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }
  }

  private readonly budgetItemInclude = {
    vendor: {
      select: {
        id: true,
        name: true,
        category: true,
        paymentStatus: true
      }
    }
  } satisfies Prisma.BudgetItemInclude;
}
