import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { InventoryImportController } from '../inventory-import.controller';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-user.type';
import { ExcelWorkbookReaderService } from '../excel-workbook-reader.service';
import { InventoryOpeningBalanceService } from '../inventory-opening-balance.service';

describe('InventoryImportController', () => {
  let controller: InventoryImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryImportController],
      providers: [
        {
          provide: InventoryOpeningBalanceService,
          useValue: { importOpeningBalance: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ExcelWorkbookReaderService,
          useValue: {
            readWorksheet: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InventoryImportController>(
      InventoryImportController,
    );
  });

  describe('importOpeningBalance', () => {
    const authenticatedRequest: AuthenticatedRequest = {
      user: {
        userId: '123e4567-e89b-42d3-a456-426614174001',
        businessId: '123e4567-e89b-42d3-a456-426614174000',
        role: 'owner',
      },
    };

    it('rejects imports even with an authenticated business', async () => {
      await expect(controller.importOpeningBalance(authenticatedRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('explains why opening-balance imports remain disabled', async () => {
      await expect(controller.importOpeningBalance(authenticatedRequest)).rejects.toThrow(
        'Opening-balance imports are temporarily disabled until business authorization is implemented.',
      );
    });

    it('rejects requests without an authenticated business context', async () => {
      const missingBusinessRequest = {
        user: {
          ...authenticatedRequest.user,
          businessId: '',
        },
      };

      await expect(controller.importOpeningBalance(missingBusinessRequest)).rejects.toThrow(
        'An authenticated business context is required.',
      );
    });
  });
});
