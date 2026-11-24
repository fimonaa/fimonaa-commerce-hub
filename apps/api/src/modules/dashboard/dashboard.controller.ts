import { Controller, Get, Req, UnauthorizedException } from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/types/authenticated-user.type";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Returns dashboard metrics for the authenticated business.
   * The global AuthenticationGuard verifies the user's
   * active membership before this controller executes.
   */
  @Get("summary")
  getSummary(@Req() request: AuthenticatedRequest) {
    const businessId = request.user?.businessId;

    if (!businessId) {
      throw new UnauthorizedException(
        "Authenticated business context required",
      );
    }

    return this.dashboardService.getSummary(businessId);
  }
}
