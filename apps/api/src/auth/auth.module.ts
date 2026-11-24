import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GuestIdGuard } from "./guest-id.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, GuestIdGuard],
  exports: [AuthService, JwtAuthGuard, GuestIdGuard],
})
export class AuthModule {}
