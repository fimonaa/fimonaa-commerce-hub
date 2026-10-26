import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as publicly accessible.
 *
 * The authentication guard will use this metadata to determine
 * whether authentication can be skipped.
 *
 * All routes should require authentication by default.
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
