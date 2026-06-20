import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { OrganizationRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { BudgetService } from "./budget.service";
import { CreateBudgetItemDto } from "./dto/create-budget-item.dto";
import { UpdateBudgetItemDto } from "./dto/update-budget-item.dto";

@Controller("events/:eventId/budget-items")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  list(@Param("eventId") eventId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetService.list(eventId, user);
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createBudgetItemDto: CreateBudgetItemDto
  ) {
    return this.budgetService.create(eventId, user, createBudgetItemDto);
  }

  @Patch(":budgetItemId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("budgetItemId") budgetItemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateBudgetItemDto: UpdateBudgetItemDto
  ) {
    return this.budgetService.update(eventId, budgetItemId, user, updateBudgetItemDto);
  }
}
