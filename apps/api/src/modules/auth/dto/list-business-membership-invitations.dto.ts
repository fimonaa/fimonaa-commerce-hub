import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const BUSINESS_INVITATION_STATUSES = [
  "all",
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;

export type BusinessInvitationStatus =
  (typeof BUSINESS_INVITATION_STATUSES)[number];

export class ListBusinessMembershipInvitationsDto {
  @IsOptional()
  @IsIn(BUSINESS_INVITATION_STATUSES)
  status: BusinessInvitationStatus = "all";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
