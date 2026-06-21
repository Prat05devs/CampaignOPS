import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ActivityModule } from "../activity/activity.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { MockAiProvider } from "./providers/mock-ai.provider";

@Module({
  imports: [JwtModule.register({}), PrismaModule, ActivityModule],
  controllers: [AiController],
  providers: [AiService, MockAiProvider],
  exports: [AiService]
})
export class AiModule {}
