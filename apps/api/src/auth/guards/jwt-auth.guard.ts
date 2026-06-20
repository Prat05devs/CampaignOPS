import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { AuthenticatedUser } from "../types/authenticated-user";

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET", "local-access-secret")
      });
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }
  }

  private extractBearerToken(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(" ");
    return type === "Bearer" ? token : null;
  }
}

