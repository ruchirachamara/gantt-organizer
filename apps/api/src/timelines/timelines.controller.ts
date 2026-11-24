import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Put,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/auth.decorators";
import type { AuthUser } from "../auth/auth.types";
import { GuestIdGuard } from "../auth/guest-id.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpsertTimelineDto } from "./dto/upsert-timeline.dto";
import { TimelinesService } from "./timelines.service";

@Controller("timelines")
export class TimelinesController {
  constructor(private readonly timelines: TimelinesService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMine(@CurrentUser() user: AuthUser) {
    const doc = await this.timelines.getMine(user.id);
    return { data: doc.data, updatedAt: doc.updatedAt };
  }

  @Put("me")
  @UseGuards(JwtAuthGuard)
  async upsertMine(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertTimelineDto
  ) {
    const doc = await this.timelines.upsertMine(user.id, body);
    return { data: doc.data, updatedAt: doc.updatedAt };
  }

  @Delete("me")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async deleteMine(@CurrentUser() user: AuthUser) {
    await this.timelines.deleteMine(user.id);
  }

  @Get("guest")
  @UseGuards(GuestIdGuard)
  async getGuest(@CurrentUser() user: AuthUser) {
    const doc = await this.timelines.getMine(user.id);
    return { data: doc.data, updatedAt: doc.updatedAt };
  }

  @Put("guest")
  @UseGuards(GuestIdGuard)
  async upsertGuest(
    @CurrentUser() user: AuthUser,
    @Body() body: UpsertTimelineDto
  ) {
    const doc = await this.timelines.upsertMine(user.id, body);
    return { data: doc.data, updatedAt: doc.updatedAt };
  }

  @Delete("guest")
  @HttpCode(204)
  @UseGuards(GuestIdGuard)
  async deleteGuest(@CurrentUser() user: AuthUser) {
    await this.timelines.deleteMine(user.id);
  }
}
