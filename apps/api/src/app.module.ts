import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CosmosModule } from "./cosmos/cosmos.module";
import { HealthController } from "./health/health.controller";
import { TimelinesModule } from "./timelines/timelines.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "apps/api/.env"],
    }),
    CosmosModule,
    AuthModule,
    TimelinesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

