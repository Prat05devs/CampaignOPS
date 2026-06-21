import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { GlobalTasksController } from "./global-tasks.controller";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [TasksController, GlobalTasksController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
