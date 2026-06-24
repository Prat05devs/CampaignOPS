import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignupDto } from "./dto/signup.dto";
import { SwitchOrganizationDto } from "./dto/switch-organization.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthenticatedUser } from "./types/authenticated-user";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post("login")
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("password-reset/request")
  requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto);
  }

  @Post("password-reset/confirm")
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("workspaces")
  listWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listWorkspaces(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post("switch-workspace")
  switchWorkspace(@Body() switchOrganizationDto: SwitchOrganizationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.switchOrganization(switchOrganizationDto, user);
  }

  @Get("invitations/:token")
  getInvitation(@Param("token") token: string) {
    return this.authService.getInvitation(token);
  }

  @Post("invitations/:token/accept")
  acceptInvitation(@Param("token") token: string, @Body() acceptInvitationDto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(token, acceptInvitationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("invitations/:token/accept-existing")
  acceptInvitationForCurrentUser(@Param("token") token: string, @CurrentUser() user: AuthenticatedUser) {
    return this.authService.acceptInvitationForCurrentUser(token, user);
  }

  @Post("refresh")
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user.sub);
  }
}
