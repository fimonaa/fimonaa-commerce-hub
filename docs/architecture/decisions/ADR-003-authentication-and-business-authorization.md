# ADR-003: Authentication and Business Authorization

**Status:** Accepted as the documented implementation baseline; production hardening pending
**Date:** 11 November 2026
**Implementation reference:** `d1c25be`, PR #7
**Related decisions:** ADR-001, ADR-002

## Context

Fimonaa Commerce Hub supports multiple independent businesses. Users can hold different roles in different businesses. Authentication must establish identity without allowing a valid token or a caller-supplied business identifier to grant access to another business.

The inventory authorization milestone already established JWT verification, membership resolution and global guards. The next milestone required credential-based login and a secure mechanism for activating invited users.

## Decision

### Identity and access tokens

Active users authenticate with email and password through `POST /api/auth/login`. Passwords are hashed and verified using Argon2id. The recorded parameters are 19,456 KiB memory cost, time cost 2 and parallelism 1. Password hashes are excluded from default entity selection. Invalid login attempts receive generic authentication errors; a dummy hash is used for missing or ineligible accounts to reduce timing differences.

Successful login issues a signed HS256 JWT access token valid for 15 minutes (900 seconds). Its `sub` claim contains a UUID user identifier. The current design uses access tokens only; it does not implement refresh tokens or server-managed sessions.

### Business authorization

Protected endpoints require `Authorization: Bearer <access-token>` and use the `X-Business-Id` header to select a business. The header is untrusted input. On protected requests, the backend validates the JWT, verifies active user and business status, resolves the user's active membership from the database, and obtains the business-specific role. The verified context contains `userId`, `businessId` and `role`.

Authentication and role guards are registered globally. Routes explicitly marked `@Public()` bypass authentication. Protected controllers use `@Roles(...)` where role restrictions are required. A user's role in one business never authorizes access to another business.

Inventory queries must additionally filter by the verified business ID, including record counts. Database constraints provide a separate ownership boundary.

### Invitations and account activation

The current workflow supports users who already exist with `invited` status and already have a membership in the selected business. It does not create users or memberships, and it does not support adding existing active users to another business.

An owner or administrator can issue an invitation through `POST /api/auth/invitations`. The service checks the target user's status and membership, prevents an additional unexpired unconsumed invitation, and uses a transaction and a row lock to coordinate issuance. The token contains 32 cryptographically secure random bytes encoded as Base64URL. Only its SHA256 hash is stored in `user_invitations`. Invitations expire after 24 hours.

For the current internal workflow, the plaintext invitation token is returned in the API response with `Cache-Control: no-store`. Tokens must not be logged or sent to analytics or monitoring systems.

`POST /api/auth/accept-invitation` is public and accepts a token and a password of 12 to 1,024 characters. It validates and locks the invitation, rejects expired or consumed tokens, locks the invited user, hashes the password, activates the account and marks the invitation consumed within a single transaction. Successful acceptance returns HTTP 204.

Migration `1792900000000-CreateUserInvitations.ts` creates the invitation table, its unique token hash, foreign key, timestamps, indexes and constraints. The invitation record references a user rather than a business. Its `down()` migration intentionally refuses automatic rollback.

## Rationale

Short-lived signed access tokens provide a straightforward initial authentication mechanism. Resolving membership and role from the database on protected requests avoids treating token contents or a caller-supplied business ID as permanent authorization. Argon2id protects stored passwords. Hashing invitation tokens reduces exposure if invitation records are disclosed. Transactional invitation consumption supports single-use activation.

## Consequences and limitations

1. Every protected business request depends on valid membership resolution and appropriate role checks.
2. Business-scoped service queries and database constraints remain necessary even with global guards.
3. Invitation tokens are sensitive credentials while they remain valid; returning them in API responses is a temporary internal workflow, not a delivery solution.
4. Invitation persistence currently has no `business_id`. Existing-user invitations and membership provisioning require separate design and likely schema changes.
5. The application has no implemented refresh-token rotation, logout revocation, password recovery, invitation email delivery, invitation cancellation or public-endpoint rate limiting.
6. Business membership administration and last-owner safeguards remain unfinished on a separate feature branch.
7. A security review, deployment hardening and operational tests are required before production use.

## Verification

The PR #7 milestone recorded 151 passing unit tests and 83 passing integration tests, along with successful TypeScript compilation and a NestJS build. These are historical milestone results, not tests executed during preparation of this ADR.

The existence of migration 6 in the repository does not confirm its execution against the protected `fimonaa_commerce` database. No protected database writes or inventory source-of-truth cutover are authorized by this decision.

## Follow-up decisions

Document session and refresh-token strategy, membership lifecycle and invitation provisioning, endpoint permission matrix, audit logging, secure invitation delivery, rate limiting and credential recovery in subsequent implementation work and ADRs as appropriate.
