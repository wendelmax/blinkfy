# Prisma rollout

## Fresh databases

Run the normal migration command. It applies the legacy baseline followed by the workspace and immutable-audit migration:

```bash
npx prisma migrate deploy
```

## Existing legacy databases created with `prisma db push`

Before the first migration deployment, run the checked-in adoption command once against that database:

```bash
npm run prisma:adopt-legacy-baseline
npx prisma migrate deploy
```

The adoption command checks that every legacy table exists, refuses databases where the workspace migration is already present, and records only `20260807230000_legacy_baseline` in Prisma's migration history. It does not run DDL or modify legacy data. It is safe to run again: once the baseline is recorded it exits without changes. The following `migrate deploy` command then applies only `20260807230500_blinkfy_workspace`.

Use an isolated `TEST_DATABASE_URL` for automated tests. Do not use development data for migration validation.
