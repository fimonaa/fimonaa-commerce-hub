import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";

import { BusinessMembershipRemovalService } from "../business-membership-removal.service";

describe("BusinessMembershipRemovalService", () => {
  const businessId = "business-a";
  const actorUserId = "actor-user";
  const membershipId = "target-membership";
  const removedAt = new Date("2026-11-22T12:00:00.000Z");

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
    status: "active",
  };

  let service: BusinessMembershipRemovalService;
  let query: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(() => {
    query = jest.fn();

    transaction = jest.fn(
      async (callback: (manager: { query: jest.Mock }) => Promise<unknown>) =>
        callback({ query }),
    );

    service = new BusinessMembershipRemovalService({
      transaction,
    } as unknown as DataSource);
  });

  function mockQueries(
    actorOverride = {},
    targetOverride = {},
    updatedRows?: Array<{
      id: string;
      user_id: string;
      role: string;
      status: string;
      removed_at: Date | null;
    }>,
  ) {
    const resolvedTarget = { ...target, ...targetOverride };

    const rows = updatedRows ?? [
      {
        ...resolvedTarget,
        status: "removed",
        removed_at: removedAt,
      },
    ];

    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([{ ...actor, ...actorOverride }])
      .mockResolvedValueOnce([resolvedTarget])
      .mockResolvedValueOnce([rows, rows.length]);
  }

  const remove = () => service.remove(businessId, actorUserId, membershipId);

  it("allows an owner to remove an active viewer", async () => {
    mockQueries();

    await expect(remove()).resolves.toEqual({
      id: membershipId,
      userId: target.user_id,
      role: "viewer",
      membershipStatus: "removed",
      removedAt,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it("allows an owner to remove a suspended membership", async () => {
    mockQueries({}, { status: "suspended" });

    const result = await remove();

    expect(result.membershipStatus).toBe("removed");
    expect(result.removedAt).toEqual(removedAt);
  });

  it.each(["admin", "inventory_manager", "operator", "viewer"])(
    "allows an owner to remove a %s membership",
    async (role) => {
      mockQueries({}, { role });

      const result = await remove();

      expect(result.role).toBe(role);
      expect(result.membershipStatus).toBe("removed");
    },
  );

  it.each(["admin", "inventory_manager", "operator", "viewer"])(
    "rejects removal by a %s",
    async (role) => {
      mockQueries({ role });

      await expect(remove()).rejects.toThrow(ForbiddenException);

      expect(query).toHaveBeenCalledTimes(2);
    },
  );

  it.each(["pending", "suspended", "removed"])(
    "rejects removal by a %s owner",
    async (status) => {
      mockQueries({ status });

      await expect(remove()).rejects.toThrow(ForbiddenException);
    },
  );

  it("rejects self-removal", async () => {
    mockQueries({}, { user_id: actorUserId });

    await expect(remove()).rejects.toThrow(ForbiddenException);
  });

  it("protects other owner memberships", async () => {
    mockQueries({}, { role: "owner" });

    await expect(remove()).rejects.toThrow(ForbiddenException);
  });

  it.each(["pending", "removed"])(
    "rejects removing a %s membership",
    async (status) => {
      mockQueries({}, { status });

      await expect(remove()).rejects.toThrow(ConflictException);
    },
  );

  it("rejects a nonexistent business", async () => {
    query.mockResolvedValueOnce([]);

    await expect(remove()).rejects.toThrow(NotFoundException);
  });

  it("rejects a missing actor membership", async () => {
    query.mockResolvedValueOnce([{ id: businessId }]).mockResolvedValueOnce([]);

    await expect(remove()).rejects.toThrow(ForbiddenException);
  });

  it("rejects a missing target membership", async () => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([actor])
      .mockResolvedValueOnce([]);

    await expect(remove()).rejects.toThrow(NotFoundException);
  });

  it("rejects an unsuccessful database update", async () => {
    mockQueries({}, {}, []);

    await expect(remove()).rejects.toThrow(ConflictException);
  });

  it("rejects inconsistent database update counts", async () => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([actor])
      .mockResolvedValueOnce([target])
      .mockResolvedValueOnce([
        [
          {
            ...target,
            status: "removed",
            removed_at: removedAt,
          },
        ],
        0,
      ]);

    await expect(remove()).rejects.toThrow(ConflictException);
  });

  it("locks the business before locking memberships", async () => {
    mockQueries();

    await remove();

    expect(query.mock.calls[0][0]).toContain(
      "FROM businesses WHERE id = $1 FOR UPDATE",
    );

    expect(query.mock.calls[1][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[2][0]).toContain("FOR UPDATE");
  });

  it("updates removed_at and updated_at", async () => {
    mockQueries();

    await remove();

    const updateSql = query.mock.calls[3][0] as string;

    expect(updateSql).toContain("status = 'removed'");
    expect(updateSql).toContain("removed_at = NOW()");
    expect(updateSql).toContain("updated_at = NOW()");
  });

  it("preserves the target role and user account", async () => {
    mockQueries({}, { role: "inventory_manager" });

    const result = await remove();

    expect(result.role).toBe("inventory_manager");

    const updateSql = query.mock.calls[3][0] as string;

    expect(updateSql).not.toMatch(/\bSET\s+role\s*=/i);
    expect(updateSql).not.toMatch(/\bDELETE\s+FROM\s+users\b/i);
  });

  it("restricts the update to the selected business", async () => {
    mockQueries();

    await remove();

    expect(query.mock.calls[2][1]).toEqual([membershipId, businessId]);

    expect(query.mock.calls[3][1]).toEqual([membershipId, businessId]);
  });
});
