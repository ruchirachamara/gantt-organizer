import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./auth.decorators";
import type { AuthUser } from "./auth.types";
import { ExchangeCodeDto } from "./dto/exchange-code.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Start Google OAuth — browser redirect handled by Nest. */
  @Get("google")
  async googleStart(@Res() res: Response) {
    if (!this.auth.isGoogleConfigured()) {
      return res
        .status(503)
        .send(
          "Google SSO is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the API."
        );
    }
    const url = await this.auth.createGoogleAuthUrl();
    return res.redirect(url);
  }

  /** Google redirects here with ?code&state — Nest exchanges and sends user back to the web app. */
  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") oauthError: string | undefined,
    @Res() res: Response
  ) {
    return this.finishOAuthCallback(res, oauthError, () =>
      this.auth.handleGoogleCallback(code, state)
    );
  }

  /** Start LinkedIn OAuth — browser redirect handled by Nest. */
  @Get("linkedin")
  async linkedInStart(@Res() res: Response) {
    if (!this.auth.isLinkedInConfigured()) {
      return res
        .status(503)
        .send(
          "LinkedIn SSO is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET on the API."
        );
    }
    const url = await this.auth.createLinkedInAuthUrl();
    return res.redirect(url);
  }

  /** LinkedIn redirects here with ?code&state — Nest exchanges and sends user back to the web app. */
  @Get("linkedin/callback")
  async linkedInCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") oauthError: string | undefined,
    @Query("error_description") errorDescription: string | undefined,
    @Res() res: Response
  ) {
    const detail = errorDescription || oauthError;
    return this.finishOAuthCallback(res, detail, () =>
      this.auth.handleLinkedInCallback(code, state)
    );
  }

  /** One-time code → app JWT (keeps the access token out of long-lived URL history). */
  @Post("exchange")
  exchange(@Body() body: ExchangeCodeDto) {
    return this.auth.exchangeCode(body.code);
  }

  private async finishOAuthCallback(
    res: Response,
    oauthError: string | undefined,
    handle: () => Promise<{ redirectUrl: string }>
  ) {
    const frontend = this.auth.getFrontendOrigin();
    if (oauthError) {
      return res.redirect(
        `${frontend}/auth/callback?error=${encodeURIComponent(oauthError)}`
      );
    }
    try {
      const { redirectUrl } = await handle();
      return res.redirect(redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      return res.redirect(
        `${frontend}/auth/callback?error=${encodeURIComponent(message)}`
      );
    }
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
