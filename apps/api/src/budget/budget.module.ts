import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService]
})
export class BudgetModule {}
