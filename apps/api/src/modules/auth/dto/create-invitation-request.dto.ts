import { IsUUID } from 'class-validator';

/**
 * Request body for issuing an invitation to an existing invited user.
 *
 * The business ID is obtained from the authenticated request context,
 * never from the request body.
 */
export class CreateInvitationRequestDto {
  @IsUUID('4')
  userId!: string;
}
