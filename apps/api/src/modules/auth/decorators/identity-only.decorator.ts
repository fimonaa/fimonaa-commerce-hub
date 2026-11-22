import { SetMetadata } from '@nestjs/common';

export const IS_IDENTITY_ONLY_KEY = 'isIdentityOnly';

export const IdentityOnly = () =>
  SetMetadata(IS_IDENTITY_ONLY_KEY, true);
