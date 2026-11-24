import { UnauthorizedException } from "@nestjs/common";

import { DashboardController } from "../dashboard.controller";
import { DashboardService } from "../dashboard.service";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-user.type";

describe("DashboardController", () => {
  const businessId = "7a078341-81e0-4b93-b443-7507776d480c";

  const dashboardResponse = {
    totalProducts: 0,
    totalSkus: 0,
  };

  const dashboardService = {
    getSummary: jest.fn(),
  };

  let controller: DashboardController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new DashboardController(
      dashboardService as unknown as DashboardService,
    );
  });

  /**
   * Creates an authenticated request context for controller tests.
   * The global guard is tested separately.
   */
  function createRequest(selectedBusinessId?: string): AuthenticatedRequest {
    return {
      user: {
        userId: "11111111-1111-4111-8111-111111111111",
        businessId: selectedBusinessId,
        role: "owner",
      },
    } as AuthenticatedRequest;
  }

  it("passes the authenticated business ID to the service", async () => {
    dashboardService.getSummary.mockResolvedValue(dashboardResponse);

    await controller.getSummary(createRequest(businessId));

    expect(dashboardService.getSummary).toHaveBeenCalledWith(businessId);
    expect(dashboardService.getSummary).toHaveBeenCalledTimes(1);
  });

  it("rejects requests without an authenticated business ID", () => {
    expect(() => controller.getSummary(createRequest())).toThrow(
      UnauthorizedException,
    );

    expect(dashboardService.getSummary).not.toHaveBeenCalled();
  });

  it("returns the dashboard metrics provided by the service", async () => {
    dashboardService.getSummary.mockResolvedValue(dashboardResponse);

    const result = await controller.getSummary(createRequest(businessId));

    expect(result).toEqual(dashboardResponse);
  });
});
