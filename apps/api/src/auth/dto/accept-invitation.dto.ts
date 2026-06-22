import { IsOptional, IsString, MinLength } from "class-validator";

export class AcceptInvitationDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
