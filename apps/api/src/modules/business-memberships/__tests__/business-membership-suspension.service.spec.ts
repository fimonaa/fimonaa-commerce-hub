import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { BusinessMembershipSuspensionService } from "../business-membership-suspension.service";

describe("BusinessMembershipSuspensionService", () => {
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
    status: "active",
  };

  let service: BusinessMembershipSuspensionService;
  let query: jest.Mock;

  beforeEach(() => {
    query = jest.fn();

    const dataSource = {
      transaction: jest.fn(
        async (callback: (manager: { query: jest.Mock }) => Promise<unknown>) =>
          callback({ query }),
      ),
    };

    service = new BusinessMembershipSuspensionService(
      dataSource as unknown as DataSource,
    );
  });

  function mockQueries(
    actorOverride = {},
    targetOverride = {},
    updatedRows = [
      {
        ...target,
        status: "suspended",
      },
    ],
  ) {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([{ ...actor, ...actorOverride }])
      .mockResolvedValueOnce([{ ...target, ...targetOverride }])
      .mockResolvedValueOnce([updatedRows, updatedRows.length]);
  }

  it("allows an owner to suspend an active viewer", async () => {
    mockQueries();

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).resolves.toEqual({
      id: membershipId,
      userId: target.user_id,
      role: "viewer",
      membershipStatus: "suspended",
    });

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[3][0]).toContain("status = 'suspended'");
    expect(query.mock.calls[3][1]).toEqual([membershipId, businessId]);
  });

  it.each(["inventory_manager", "operator", "viewer"])(
    "allows an admin to suspend an active %s",
    async (role) => {
      mockQueries({ role: "admin" }, { role });

      await expect(
        service.suspend(businessId, actorUserId, membershipId),
      ).resolves.toMatchObject({
        membershipStatus: "suspended",
      });
    },
  );

  it("allows an owner to suspend an active admin", async () => {
    mockQueries({}, { role: "admin" });

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).resolves.toMatchObject({
      membershipStatus: "suspended",
    });
  });

  it("rejects an admin suspending another admin", async () => {
    mockQueries({ role: "admin" }, { role: "admin" });

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(query).toHaveBeenCalledTimes(3);
  });

  it("rejects self-suspension", async () => {
    mockQueries({}, { user_id: actorUserId });

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(["owner", "admin"])(
    "rejects suspending an owner when actor is %s",
    async (role) => {
      mockQueries({ role }, { role: "owner" });

      await expect(
        service.suspend(businessId, actorUserId, membershipId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it.each(["pending", "suspended", "removed"])(
    "rejects suspending a %s membership",
    async (status) => {
      mockQueries({}, { status });

      await expect(
        service.suspend(businessId, actorUserId, membershipId),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(query).toHaveBeenCalledTimes(3);
    },
  );

  it.each(["viewer", "operator", "inventory_manager"])(
    "rejects a %s actor",
    async (role) => {
      mockQueries({ role });

      await expect(
        service.suspend(businessId, actorUserId, membershipId),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(query).toHaveBeenCalledTimes(2);
    },
  );

  it("rejects a suspended actor", async () => {
    mockQueries({ status: "suspended" });

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a nonexistent business", async () => {
    query.mockResolvedValueOnce([]);

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rejects a nonexistent target membership", async () => {
    query
      .mockResolvedValueOnce([{ id: businessId }])
      .mockResolvedValueOnce([actor])
      .mockResolvedValueOnce([]);

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a missing actor membership", async () => {
    query.mockResolvedValueOnce([{ id: businessId }]).mockResolvedValueOnce([]);

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an unsuccessful database update", async () => {
    mockQueries({}, {}, []);

    await expect(
      service.suspend(businessId, actorUserId, membershipId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("locks the business before checking memberships", async () => {
    mockQueries();

    await service.suspend(businessId, actorUserId, membershipId);

    expect(query.mock.calls[0][0]).toContain(
      "SELECT id FROM businesses WHERE id = $1 FOR UPDATE",
    );

    expect(query.mock.calls[1][0]).toContain("FOR UPDATE");
    expect(query.mock.calls[2][0]).toContain("FOR UPDATE");
  });
});
