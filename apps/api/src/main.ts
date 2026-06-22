import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const normalizeOrigin = (origin: string) => {
    try {
      return new URL(origin).origin;
    } catch {
      return origin.trim().replace(/\/+$/, "");
    }
  };
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://campaign-ops-nine.vercel.app"
  ];
  const allowedOrigins = new Set(
    [
      ...defaultOrigins,
      ...configService
        .get<string>("WEB_ORIGINS", "")
        .split(",")
        .map((origin) => origin.trim())
    ]
      .filter(Boolean)
      .map(normalizeOrigin)
  );

  app.setGlobalPrefix("api");
  app.enableCors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(port);
}

void bootstrap();
