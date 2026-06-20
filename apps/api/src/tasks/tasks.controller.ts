import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { OrganizationRole, TaskStatus } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller("events/:eventId/tasks")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("status") status?: TaskStatus
  ) {
    return this.tasksService.list(eventId, user, { status });
  }

  @Post()
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  create(
    @Param("eventId") eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createTaskDto: CreateTaskDto
  ) {
    return this.tasksService.create(eventId, user, createTaskDto);
  }

  @Patch(":taskId")
  @Roles(OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  update(
    @Param("eventId") eventId: string,
    @Param("taskId") taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateTaskDto: UpdateTaskDto
  ) {
    return this.tasksService.update(eventId, taskId, user, updateTaskDto);
  }
}
