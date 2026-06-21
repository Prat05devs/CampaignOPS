import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { TasksService } from "./tasks.service";

@Controller("tasks")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GlobalTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  listAcrossEvents(@CurrentUser() user: AuthenticatedUser, @Query("status") status?: TaskStatus) {
    return this.tasksService.listAcrossEvents(user, { status });
  }
}
