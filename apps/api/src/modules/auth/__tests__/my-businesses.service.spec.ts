import { MyBusinessesService } from "../my-businesses.service";
import type { BusinessMembership } from "../entities/business-membership.entity";
import type { Repository } from "typeorm";

describe("MyBusinessesService", () => {
  let service: MyBusinessesService;

  let queryBuilder: {
    innerJoin: jest.Mock;
    select: jest.Mock;
    addSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    getRawMany: jest.Mock;
  };

  const userId = "550e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<BusinessMembership>;

    service = new MyBusinessesService(repository);
  });

  it("returns accessible businesses with their membership roles", async () => {
    const businesses = [
      {
        id: "660e8400-e29b-41d4-a716-446655440000",
        name: "Fimonaa India",
        slug: "fimonaa-india",
        role: "owner",
      },
      {
        id: "770e8400-e29b-41d4-a716-446655440000",
        name: "Fimonaa Finland",
        slug: "fimonaa-finland",
        role: "admin",
      },
    ];

    queryBuilder.getRawMany.mockResolvedValue(businesses);

    await expect(service.list(userId)).resolves.toEqual({
      data: businesses,
    });
  });

  it("restricts results to the authenticated user", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await service.list(userId);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      "membership.userId = :userId",
      { userId },
    );
  });

  it("includes only active memberships", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await service.list(userId);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "membership.status = :membershipStatus",
      { membershipStatus: "active" },
    );
  });

  it("includes only active businesses", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await service.list(userId);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "business.status = :businessStatus",
      { businessStatus: "active" },
    );
  });

  it("joins businesses through their membership business ID", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await service.list(userId);

    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      "business",
      "business.id = membership.businessId",
    );
  });

  it("returns an empty list when no businesses are accessible", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await expect(service.list(userId)).resolves.toEqual({
      data: [],
    });
  });

  it("orders businesses consistently by name and ID", async () => {
    queryBuilder.getRawMany.mockResolvedValue([]);

    await service.list(userId);

    expect(queryBuilder.orderBy).toHaveBeenCalledWith("business.name", "ASC");

    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith("business.id", "ASC");
  });
});
