import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller()
export class HealthController {
  /** Hitting the API root (e.g. :3001) should open the Gantt web app. */
  @Get()
  root(@Res() res: Response) {
    const frontend =
      process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:3000";
    return res.redirect(302, frontend.replace(/\/$/, ""));
  }

  @Get("health")
  check() {
    return { ok: true, service: "gantt-api" };
  }
}
