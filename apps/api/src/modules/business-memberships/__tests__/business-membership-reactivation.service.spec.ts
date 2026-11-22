import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { BusinessMembershipReactivationService } from "../business-membership-reactivation.service";

describe("BusinessMembershipReactivationService", () => {
  const businessId = "business-a";
  const actorUserId = "actor-user";
  const membershipId = "target-membership";

  const actor = {
    id: "actor-membership",
    user_id: actorUserId,
    role: "owner",
    status: "active",
  };

  const target = {
    id: membershipId,
    user_id: "target-user",
    role: "viewer",
    status: "suspended",
  };

  let service: BusinessMembershipReactivationService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn();

    const dataSource = {
      transaction: jest.fn(
        async (callback: (manager: { query: jest.Mock }) => Promise<unknown>) =>
          callback({ query }),
      ),
    };

    service = new BusinessMembershipReactivationService(
      dataSource as unknown as DataSource,
    );
  });

  function mockQueries(
    actorOverride = {},
    targetOverride = {},
    updatedRows?: Array<{
      id: string;
      user_id: string;
      role: string;
      status: string;
    }>,
  ) {
    const resolvedTarget = { ...target, ...targetOverride };

    const rows = updatedRows ?? [
      {
        ...resolvedTarget,
        status: "active",
      },
    ];

    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([{ ...actor, ...actorOverride }])
      .mockResolvedValueOnce([resolvedTarget])
      .mockResolvedValueOnce([rows, rows.length]);
  }

  it("allows an owner to reactivate a suspended viewer", async () => {
    mockQueries();

    const result = await service.reactivate(
      businessId,
      actorUserId,
      membershipId,
    );

    expect(result).toEqual({
      id: membershipId,
      userId: target.user_id,
      role: "viewer",
      membershipStatus: "active",
    });

    expect(query).toHaveBeenCalledTimes(4);

    expect(query.mock.calls[3][0]).toContain("SET status = 'active'");

    expect(query.mock.calls[3][1]).toEqual([membershipId, businessId]);
  });

  it.each(["inventory_manager", "operator", "viewer"])(
    "allows an admin to reactivate a suspended %s",
    async (role) => {
      mockQueries({ role: "admin" }, { role });

      const result = await service.reactivate(
        businessId,
        actorUserId,
        membershipId,
      );

      expect(result).toMatchObject({
        role,
        membershipStatus: "active",
      });
    },
  );

  it("allows an owner to reactivate a suspended admin", async () => {
    mockQueries({}, { role: "admin" });

    const result = await service.reactivate(
      businessId,
      actorUserId,
      membershipId,
    );

    expect(result).toMatchObject({
      role: "admin",
      membershipStatus: "active",
    });
  });

  it("rejects an admin reactivating another admin", async () => {
    mockQueries({ role: "admin" }, { role: "admin" });

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects self-reactivation", async () => {
    mockQueries({}, { user_id: actorUserId });

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each(["owner", "admin"])(
    "protects owner memberships when actor is %s",
    async (role) => {
      mockQueries({ role }, { role: "owner" });

      await expect(
        service.reactivate(businessId, actorUserId, membershipId),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it.each(["pending", "active", "removed"])(
    "rejects reactivating a %s membership",
    async (status) => {
      mockQueries({}, { status });

      await expect(
        service.reactivate(businessId, actorUserId, membershipId),
      ).rejects.toThrow(ConflictException);
    },
  );

  it.each(["viewer", "operator", "inventory_manager"])(
    "rejects a %s actor",
    async (role) => {
      mockQueries({ role });

      await expect(
        service.reactivate(businessId, actorUserId, membershipId),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it("rejects a suspended actor", async () => {
    mockQueries({ status: "suspended" });

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects a nonexistent business", async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects a nonexistent target membership", async () => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([actor])
      .mockResolvedValueOnce([]);

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects a missing actor membership", async () => {
    query.mockResolvedValueOnce([{ id: businessId }]).mockResolvedValueOnce([]);

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(ForbiddenException);
  });

  it("rejects an unsuccessful database update", async () => {
    mockQueries({}, {}, []);

    await expect(
      service.reactivate(businessId, actorUserId, membershipId),
    ).rejects.toThrow(ConflictException);
  });

  it("locks the business before checking memberships", async () => {
    mockQueries();

    await service.reactivate(businessId, actorUserId, membershipId);

    expect(query.mock.calls[0][0]).toContain(
      "FROM businesses WHERE id = $1 FOR UPDATE",
    );

    expect(query.mock.calls[1][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[2][0]).toContain("FOR UPDATE");
  });

  it("preserves the existing membership role", async () => {
    mockQueries({}, { role: "inventory_manager" });

    const result = await service.reactivate(
      businessId,
      actorUserId,
      membershipId,
    );

    expect(result.role).toBe("inventory_manager");

    const updateSql = query.mock.calls[3][0] as string;

    expect(updateSql).not.toMatch(/SET\s+role\s*=/i);
    expect(updateSql).toContain("SET status = 'active'");
  });
});
