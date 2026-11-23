import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Business } from "./entities/business.entity";
import {
  BusinessMembership,
  type BusinessRole,
} from "./entities/business-membership.entity";

export interface MyBusiness {
  id: string;
  name: string;
  slug: string;
  role: BusinessRole;
}

export interface MyBusinessesResponse {
  data: MyBusiness[];
}

@Injectable()
export class MyBusinessesService {
  constructor(
    @InjectRepository(BusinessMembership)
    private readonly memberships: Repository<BusinessMembership>,
  ) {}

  async list(userId: string): Promise<MyBusinessesResponse> {
    const memberships = await this.memberships
      .createQueryBuilder("membership")
      .innerJoin(Business, "business", "business.id = membership.businessId")
      .select("business.id", "id")
      .addSelect("business.name", "name")
      .addSelect("business.slug", "slug")
      .addSelect("membership.role", "role")
      .where("membership.userId = :userId", { userId })
      .andWhere("membership.status = :membershipStatus", {
        membershipStatus: "active",
      })
      .andWhere("business.status = :businessStatus", {
        businessStatus: "active",
      })
      .orderBy("business.name", "ASC")
      .addOrderBy("business.id", "ASC")
      .getRawMany<MyBusiness>();

    return { data: memberships };
  }
}
