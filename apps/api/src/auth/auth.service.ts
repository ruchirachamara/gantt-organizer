import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { SignJWT, jwtVerify } from "jose";
import type { AuthUser } from "./auth.types";

const TOKEN_TTL = "7d";
const STATE_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

type OAuthPurpose = "google_oauth" | "linkedin_oauth";

type PendingExchange = {
  accessToken: string;
  user: AuthUser;
  expiresAt: number;
};

type LinkedInUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
};

@Injectable()
export class AuthService {
  private readonly pendingExchanges = new Map<string, PendingExchange>();

  constructor(private readonly config: ConfigService) {}

  isGoogleConfigured(): boolean {
    return Boolean(
      this.config.get<string>("GOOGLE_CLIENT_ID")?.trim() &&
        this.config.get<string>("GOOGLE_CLIENT_SECRET")?.trim()
    );
  }

  isLinkedInConfigured(): boolean {
    return Boolean(
      this.config.get<string>("LINKEDIN_CLIENT_ID")?.trim() &&
        this.config.get<string>("LINKEDIN_CLIENT_SECRET")?.trim()
    );
  }

  getGoogleRedirectUri(): string {
    const explicit = this.config.get<string>("GOOGLE_REDIRECT_URI")?.trim();
    if (explicit) return explicit;
    return `${this.getApiPublicUrl()}/auth/google/callback`;
  }

  getLinkedInRedirectUri(): string {
    const explicit = this.config.get<string>("LINKEDIN_REDIRECT_URI")?.trim();
    if (explicit) return explicit;
    // Default via the Next.js /api proxy (same origin users hit in the browser).
    return `${this.getFrontendOrigin()}/api/auth/linkedin/callback`;
  }

  getFrontendOrigin(): string {
    return (
      this.config.get<string>("FRONTEND_ORIGIN")?.trim() ||
      "http://localhost:3010"
    ).replace(/\/$/, "");
  }

  private getApiPublicUrl(): string {
    return (
      this.config.get<string>("API_PUBLIC_URL")?.trim() ||
      `http://localhost:${this.config.get<string>("PORT")?.trim() || "3001"}`
    ).replace(/\/$/, "");
  }

  private createOAuthClient(): OAuth2Client {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID")?.trim();
    const clientSecret = this.config
      .get<string>("GOOGLE_CLIENT_SECRET")
      ?.trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set"
      );
    }
    return new OAuth2Client(clientId, clientSecret, this.getGoogleRedirectUri());
  }

  async createGoogleAuthUrl(): Promise<string> {
    const client = this.createOAuthClient();
    const state = await this.signState("google_oauth");
    return client.generateAuthUrl({
      access_type: "online",
      prompt: "select_account",
      scope: ["openid", "email", "profile"],
      state,
      include_granted_scopes: true,
    });
  }

  async handleGoogleCallback(
    code: string | undefined,
    state: string | undefined
  ): Promise<{ redirectUrl: string }> {
    if (!code) {
      throw new BadRequestException("Missing Google authorization code");
    }
    await this.verifyState(state, "google_oauth");

    const client = this.createOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) {
      throw new UnauthorizedException("Google did not return an id_token");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.config.get<string>("GOOGLE_CLIENT_ID")?.trim(),
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      throw new UnauthorizedException("Google token missing subject");
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      givenName: payload.given_name,
      familyName: payload.family_name,
      picture: payload.picture,
    };
    return this.finishOAuthLogin(user);
  }

  async createLinkedInAuthUrl(): Promise<string> {
    const clientId = this.config.get<string>("LINKEDIN_CLIENT_ID")?.trim();
    if (!clientId) {
      throw new BadRequestException("LINKEDIN_CLIENT_ID must be set");
    }
    const state = await this.signState("linkedin_oauth");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: this.getLinkedInRedirectUri(),
      state,
      scope: "openid profile email",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleLinkedInCallback(
    code: string | undefined,
    state: string | undefined
  ): Promise<{ redirectUrl: string }> {
    if (!code) {
      throw new BadRequestException("Missing LinkedIn authorization code");
    }
    await this.verifyState(state, "linkedin_oauth");

    const clientId = this.config.get<string>("LINKEDIN_CLIENT_ID")?.trim();
    const clientSecret = this.config
      .get<string>("LINKEDIN_CLIENT_SECRET")
      ?.trim();
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set"
      );
    }

    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.getLinkedInRedirectUri(),
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );
    const tokenBody = (await tokenRes.json().catch(() => null)) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    } | null;
    if (!tokenRes.ok || !tokenBody?.access_token) {
      const detail =
        tokenBody?.error_description ||
        tokenBody?.error ||
        `LinkedIn token exchange failed (${tokenRes.status})`;
      throw new UnauthorizedException(detail);
    }

    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const profile = (await profileRes.json().catch(() => null)) as
      | LinkedInUserInfo
      | null;
    if (!profileRes.ok || !profile?.sub) {
      throw new UnauthorizedException("LinkedIn profile lookup failed");
    }

    const user: AuthUser = {
      // Prefix so Google / LinkedIn subjects never collide in our user ids.
      id: `linkedin:${profile.sub}`,
      email: profile.email,
      name: profile.name,
      givenName: profile.given_name,
      familyName: profile.family_name,
      picture: profile.picture,
    };
    return this.finishOAuthLogin(user);
  }

  private async finishOAuthLogin(
    user: AuthUser
  ): Promise<{ redirectUrl: string }> {
    const accessToken = await this.signAppToken(user);
    const exchangeCode = this.createExchangeCode(accessToken, user);
    const redirectUrl = `${this.getFrontendOrigin()}/auth/callback?code=${encodeURIComponent(exchangeCode)}`;
    return { redirectUrl };
  }

  exchangeCode(code: string | undefined): { accessToken: string; user: AuthUser } {
    if (!code) throw new BadRequestException("Missing exchange code");
    const pending = this.pendingExchanges.get(code);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingExchanges.delete(code);
      throw new UnauthorizedException("Invalid or expired login code");
    }
    // Keep briefly so a React Strict Mode double-fetch can still succeed.
    pending.expiresAt = Math.min(pending.expiresAt, Date.now() + 5_000);
    return { accessToken: pending.accessToken, user: pending.user };
  }

  async verifyAppToken(token: string): Promise<AuthUser> {
    const secret = this.jwtSecret();
    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      const sub = typeof payload.sub === "string" ? payload.sub : null;
      if (!sub) throw new UnauthorizedException("Invalid token subject");
      return {
        id: sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        name: typeof payload.name === "string" ? payload.name : undefined,
        givenName:
          typeof payload.givenName === "string" ? payload.givenName : undefined,
        familyName:
          typeof payload.familyName === "string"
            ? payload.familyName
            : undefined,
        picture:
          typeof payload.picture === "string" ? payload.picture : undefined,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private createExchangeCode(accessToken: string, user: AuthUser): string {
    this.pruneExchanges();
    const code = createHash("sha256")
      .update(randomBytes(32))
      .digest("hex");
    this.pendingExchanges.set(code, {
      accessToken,
      user,
      expiresAt: Date.now() + EXCHANGE_TTL_MS,
    });
    return code;
  }

  private pruneExchanges(): void {
    const now = Date.now();
    for (const [key, value] of this.pendingExchanges) {
      if (value.expiresAt < now) this.pendingExchanges.delete(key);
    }
  }

  private async signState(purpose: OAuthPurpose): Promise<string> {
    return new SignJWT({ purpose })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${STATE_TTL_MS / 1000}s`)
      .setJti(randomBytes(16).toString("hex"))
      .sign(this.jwtSecret());
  }

  private async verifyState(
    state: string | undefined,
    purpose: OAuthPurpose
  ): Promise<void> {
    if (!state) throw new BadRequestException("Missing OAuth state");
    try {
      const { payload } = await jwtVerify(state, this.jwtSecret(), {
        algorithms: ["HS256"],
      });
      if (payload.purpose !== purpose) {
        throw new UnauthorizedException("Invalid OAuth state");
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new UnauthorizedException("Invalid or expired OAuth state");
    }
  }

  private async signAppToken(user: AuthUser): Promise<string> {
    return new SignJWT({
      email: user.email,
      name: user.name,
      givenName: user.givenName,
      familyName: user.familyName,
      picture: user.picture,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(TOKEN_TTL)
      .sign(this.jwtSecret());
  }

  private jwtSecret(): Uint8Array {
    const raw = this.config.get<string>("JWT_SECRET")?.trim();
    if (!raw || raw.length < 16) {
      throw new UnauthorizedException(
        "JWT_SECRET is not configured (min 16 characters)"
      );
    }
    return new TextEncoder().encode(raw);
  }
}
