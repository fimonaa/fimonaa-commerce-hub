import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthController } from './health.controller';
import { DashboardController } from './dashboard.controller';
import { InventoryImportController } from './inventory-import.controller';
import { InventoryOpeningBalanceService } from './inventory-opening-balance.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
  controllers: [HealthController, DashboardController, InventoryImportController],
providers: [InventoryOpeningBalanceService],
})
export class AppModule {}