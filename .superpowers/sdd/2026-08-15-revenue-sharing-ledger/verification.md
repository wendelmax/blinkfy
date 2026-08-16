# Revenue Sharing Ledger — Task 6 Verification

Date: 2026-08-15 (America/Sao_Paulo)

Implementation base: `d40c5a09f85b526406f82a1cf15b6c91bfc7db29` (`feat: add revenue ledger queries and reversals`)

Database: `postgresql://user@127.0.0.1:55433/blinkfy_revenue_test`

## Database migrations

The literal command specified by the brief was attempted first:

```sh
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

It exited `127` with `sh: 1: prisma: not found`. This is expected: Prisma is
intentionally installed in the `apps/api` workspace rather than hoisted at the
repository root. No root dependency was added for this documentation-only task.

The workspace-aware correction was run against the required database:

```sh
DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm exec --workspace=apps/api -- prisma migrate deploy --schema prisma/schema.prisma
```

Exit `0`: Prisma found 23 migrations and reported `No pending migrations to
apply.`

```sh
TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' apps/api/node_modules/.bin/prisma migrate status --schema apps/api/prisma/schema.prisma
```

Exit `0`: Prisma found 23 migrations and reported `Database schema is up to
date!`

## Complete repository verification

| Command | Result | Exact evidence |
| --- | --- | --- |
| `TEST_DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' DATABASE_URL='postgresql://user@127.0.0.1:55433/blinkfy_revenue_test' npm run test --workspace=apps/api` | PASS, exit `0` | 71 test files passed; 216 tests passed. |
| `npm run test --workspace=apps/web` | PASS, exit `0` | 21 test files passed; 36 tests passed. |
| `npm run build --workspace=packages/shared` | PASS, exit `0` | Shared package build passed. |
| `npm run build --workspace=apps/web` | PASS, exit `0` | Next.js 16.2.9 build passed and generated 8 pages. |
| `docker compose build api web` | FAIL, exit `1` | Docker daemon unavailable: `failed to connect to the docker API at unix:///var/run/docker.sock ... no such file or directory`. Compose also warned that `version` is obsolete. |
| `docker.exe compose build api web` | PASS, exit `0` | Docker Desktop built `blinkfy-revenue-exec-api` and `blinkfy-revenue-exec-web`. API image completed `npm ci`, shared build, Prisma generate, and export; web image completed `npm ci`, shared build, and Next.js 16.2.9 build/export for 8 pages. |

`npm ci --include=dev` completed before the successful rerun, installing 554
packages. Its audit summary reported 11 vulnerabilities: 2 low, 1 moderate, 6
high, and 2 critical. This task does not remediate dependencies; the inventory
and any remediation belong to the separate post-merge #137 security gate.

The WSL Docker daemon remains unavailable, but `docker.exe` uses Docker Desktop
and exercises the same Compose configuration successfully. The complete Task 6
verification gate is green; the WSL socket is an environment-specific launcher
limitation, not a remaining build blocker.

### Docker context correction: RED then GREEN

Docker Desktop reproduced a separate context defect before the image build: the
Compose build context is the repository root (`context: .`), so the
`apps/api/.dockerignore` and `apps/web/.dockerignore` files did not apply.
After `npm ci`, `docker.exe compose build api web` failed with
`invalid file request apps/api/node_modules/.bin/prisma` because nested local
`node_modules` entered the root build context. This is recorded as RED
evidence, not a successful Docker verification.

The root `.dockerignore` now excludes `.git`, `.superpowers`, root and nested
`node_modules`, `.next`, `dist`, `coverage`, local `.env` files, and logs. It
does not exclude source files, package manifests, or lockfiles. The subsequent
`docker.exe compose build api web` exited `0` and built both images, providing
the GREEN verification through Docker Desktop despite the unavailable WSL
daemon.

## Diff and boundary review

```sh
git diff --check origin/main...HEAD
```

Exit `0`, with no whitespace errors. The reviewed feature diff contains the
ledger migration, schema, placement/revenue routes/controllers/services, and
their tests. `paymentService.js` is absent from the changed-path list; the
legacy `Placement` and `WalletTransaction` model definitions have no modified
hunks. A targeted scan of the new ledger implementation/migration for provider
calls, payment secrets/API keys, and floating-point/decimal financial fields
returned only the intentional `transferred: false` response markers. The
financial schema fields `grossAmountMinor`, `recruiterAmountMinor`, and
`platformAmountMinor` are `Int`.

## Delivery gate

- Previous documentation/verification commit: `67cc273a9a5687dc09d8a4ddf0c356c42c829d2c` (`docs: verify recruiter revenue sharing ledger`). This SHA precedes the present evidence-correction commit; it is not asserted as this commit's self-hash.
- Issue #24 was not commented on or closed: this branch has not been reviewed or merged. Docker verification is complete through Docker Desktop.
- Issue #137 was not started. The `npm ci` audit inventory (11 vulnerabilities: 2 low, 1 moderate, 6 high, 2 critical) reinforces that it is a separate final security gate to execute only after this revenue-sharing PR is merged, in its own branch and PR.
