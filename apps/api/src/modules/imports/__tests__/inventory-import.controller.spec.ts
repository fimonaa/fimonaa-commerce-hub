import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { InventoryImportController } from '../inventory-import.controller';
import { ExcelWorkbookReaderService } from '../excel-workbook-reader.service';

describe('InventoryImportController', () => {
  let controller: InventoryImportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryImportController],
      providers: [
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
    it('rejects inventory imports while authorization is unavailable', () => {
      expect(() => controller.importOpeningBalance()).toThrow(
        ForbiddenException,
      );
    });

    it('explains why inventory imports are disabled', () => {
      expect(() => controller.importOpeningBalance()).toThrow(
        'Opening-balance imports are temporarily disabled until business authorization is implemented.',
      );
    });
  });
});