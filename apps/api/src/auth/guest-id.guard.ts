import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AuthUser } from "./auth.types";

const GUEST_ID_RE =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class GuestIdGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const allow =
      (this.config.get<string>("ALLOW_GUEST_TIMELINES") ?? "true")
        .trim()
        .toLowerCase() !== "false";
    if (!allow) {
      throw new ServiceUnavailableException("Guest timelines are disabled");
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();

    const raw = request.headers["x-guest-id"];
    const guestId = Array.isArray(raw) ? raw[0] : raw;
    if (!guestId || !GUEST_ID_RE.test(guestId)) {
      throw new UnauthorizedException(
        "Missing or invalid X-Guest-Id header (expected guest_<uuid>)"
      );
    }

    request.user = { id: guestId };
    return true;
  }
}
