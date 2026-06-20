import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { OutreachController } from "./outreach.controller";
import { OutreachService } from "./outreach.service";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [OutreachController],
  providers: [OutreachService],
  exports: [OutreachService]
})
export class OutreachModule {}
