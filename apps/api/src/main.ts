import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

const parseOrigins = (): string[] => {
  const raw =
    process.env.FRONTEND_ORIGINS?.trim() ||
    process.env.FRONTEND_ORIGIN?.trim() ||
    "http://localhost:3010";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Local web defaults (port 3000 is often taken by other tools e.g. Grafana).
  for (const origin of [
    "http://localhost:3010",
    "http://127.0.0.1:3010",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]) {
    if (!list.includes(origin)) list.push(origin);
  }
  return list;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "no-referrer" },
    })
  );

  app.enableCors({
    origin: parseOrigins(),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = Number(process.env.PORT) || 3001;
  const frontend =
    process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:3010";
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Open the Gantt app at ${frontend.replace(/\/$/, "")}`);
}

void bootstrap();
