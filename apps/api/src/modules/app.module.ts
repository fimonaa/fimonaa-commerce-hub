import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { validateEnvironment } from "../config/validate-environment";

import { AuthModule } from "./auth/auth.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { ImportsModule } from "./imports/imports.module";
import { InventoryModule } from "./inventory/inventory.module";
import { BusinessMembershipsModule } from "./business-memberships/business-memberships.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      // Reject missing or insecure environment configuration during startup.
      validate: validateEnvironment,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.getOrThrow<string>("DATABASE_URL"),
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),

    AuthModule,
    HealthModule,
    DashboardModule,
    ImportsModule,
    InventoryModule,
    BusinessMembershipsModule,
  ],
})
export class AppModule {}
