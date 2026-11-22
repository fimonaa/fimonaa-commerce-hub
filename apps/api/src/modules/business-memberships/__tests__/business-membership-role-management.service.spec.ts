import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { BusinessMembershipRoleManagementService } from "../business-membership-role-management.service";

describe("BusinessMembershipRoleManagementService", () => {
  const businessId = "550e8400-e29b-41d4-a716-446655440001";
  const actorUserId = "550e8400-e29b-41d4-a716-446655440002";
  const targetUserId = "550e8400-e29b-41d4-a716-446655440003";
  const membershipId = "550e8400-e29b-41d4-a716-446655440004";

  let service: BusinessMembershipRoleManagementService;
  let query: jest.Mock;

  const actor = {
    id: "550e8400-e29b-41d4-a716-446655440005",
    user_id: actorUserId,
    role: "owner",
    status: "active",
  };

  const target = {
    id: membershipId,
    user_id: targetUserId,
    role: "viewer",
    status: "active",
  };

  const mockQueries = (
    actorRows: unknown[] = [actor],
    targetRows: unknown[] = [target],
    updatedRows: unknown[] = [{ ...target, role: "operator" }],
  ) => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce(actorRows)
      .mockResolvedValueOnce(targetRows)
      .mockResolvedValueOnce([updatedRows, updatedRows.length]);
  };

  beforeEach(() => {
    query = jest.fn();

    const manager = { query };

    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    } as unknown as DataSource;

    service = new BusinessMembershipRoleManagementService(dataSource);
  });

  it("updates a non-owner role when requested by an active owner", async () => {
    mockQueries();

    const result = await service.updateRole(
      businessId,
      actorUserId,
      membershipId,
      "operator",
    );

    expect(result).toEqual({
      id: membershipId,
      userId: targetUserId,
      role: "operator",
      membershipStatus: "active",
    });

    expect(query).toHaveBeenCalledTimes(4);

    expect(query.mock.calls[0][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[1][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[2][0]).toContain("FOR UPDATE");

    expect(query.mock.calls[1][1]).toEqual([businessId, actorUserId]);

    expect(query.mock.calls[2][1]).toEqual([membershipId, businessId]);

    expect(query.mock.calls[3][1]).toEqual([
      "operator",
      membershipId,
      businessId,
    ]);
  });

  it("rejects role changes when the business does not exist", async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(NotFoundException);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing", []],
    ["inactive", [{ ...actor, status: "suspended" }]],
    ["admin", [{ ...actor, role: "admin" }]],
  ])("rejects an actor who is %s", async (_scenario, actors) => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce(actors);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(ForbiddenException);

    expect(query).toHaveBeenCalledTimes(2);
  });

  it("does not expose memberships from another business", async () => {
    mockQueries([actor], []);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(NotFoundException);

    expect(query).toHaveBeenCalledTimes(3);
  });

  it("rejects self-modification", async () => {
    mockQueries([actor], [{ ...target, user_id: actorUserId }]);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(ForbiddenException);

    expect(query).toHaveBeenCalledTimes(3);
  });

  it("protects owner memberships", async () => {
    mockQueries([actor], [{ ...target, role: "owner" }]);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(ForbiddenException);

    expect(query).toHaveBeenCalledTimes(3);
  });

  it.each(["pending", "suspended", "removed"])(
    "rejects a %s target membership",
    async (status) => {
      mockQueries([actor], [{ ...target, status }]);

      await expect(
        service.updateRole(businessId, actorUserId, membershipId, "operator"),
      ).rejects.toThrow(ConflictException);

      expect(query).toHaveBeenCalledTimes(3);
    },
  );

  it("rejects an unchanged role", async () => {
    mockQueries();

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "viewer"),
    ).rejects.toThrow(ConflictException);

    expect(query).toHaveBeenCalledTimes(3);
  });

  it("rejects an unsuccessful database update", async () => {
    mockQueries([actor], [target], []);

    await expect(
      service.updateRole(businessId, actorUserId, membershipId, "operator"),
    ).rejects.toThrow(ConflictException);

    expect(query).toHaveBeenCalledTimes(4);
  });

  it.each(["owner", "invalid", "", null, undefined])(
    "rejects invalid role value %s before opening a transaction",
    async (invalidRole) => {
      await expect(
        service.updateRole(
          businessId,
          actorUserId,
          membershipId,
          invalidRole as "viewer",
        ),
      ).rejects.toThrow(BadRequestException);

      expect(query).not.toHaveBeenCalled();
    },
  );
});
