-- Multi-tenant marketplace placement and append-only revenue evidence.
ALTER TYPE "ApplicationStage" ADD VALUE 'hired';
ALTER TABLE "candidate_applications" ADD COLUMN "hiredAt" TIMESTAMP(3);

CREATE TYPE "marketplace_placement_status" AS ENUM ('confirmed');
CREATE TYPE "revenue_allocation_status" AS ENUM ('pending', 'available', 'reversed');
CREATE TYPE "revenue_ledger_entry_kind" AS ENUM ('allocation', 'reversal');

CREATE UNIQUE INDEX "clients_workspace_id_key"
  ON "Client"("workspaceId", "id");
CREATE UNIQUE INDEX "candidate_applications_client_id_key"
  ON "candidate_applications"("clientId", "id");

CREATE TABLE "marketplace_placements" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "recruiterUserId" TEXT NOT NULL,
    "status" "marketplace_placement_status" NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_placements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "placement_revenue_allocations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "recruiterUserId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "grossAmountMinor" INTEGER NOT NULL,
    "recruiterBasisPoints" INTEGER NOT NULL DEFAULT 7000,
    "platformBasisPoints" INTEGER NOT NULL DEFAULT 3000,
    "recruiterAmountMinor" INTEGER NOT NULL,
    "platformAmountMinor" INTEGER NOT NULL,
    "status" "revenue_allocation_status" NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_revenue_allocations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "revenue_allocations_gross_positive_check"
      CHECK ("grossAmountMinor" > 0),
    CONSTRAINT "revenue_allocations_recruiter_bps_range_check"
      CHECK ("recruiterBasisPoints" BETWEEN 0 AND 10000),
    CONSTRAINT "revenue_allocations_platform_bps_range_check"
      CHECK ("platformBasisPoints" BETWEEN 0 AND 10000),
    CONSTRAINT "revenue_allocations_basis_points_total_check"
      CHECK ("recruiterBasisPoints" + "platformBasisPoints" = 10000),
    CONSTRAINT "revenue_allocations_amounts_nonnegative_check"
      CHECK ("recruiterAmountMinor" >= 0 AND "platformAmountMinor" >= 0),
    CONSTRAINT "revenue_allocations_amounts_total_check"
      CHECK ("recruiterAmountMinor" + "platformAmountMinor" = "grossAmountMinor"),
    CONSTRAINT "revenue_allocations_recruiter_split_check"
      CHECK (
        "recruiterAmountMinor" =
          (("grossAmountMinor"::BIGINT * "recruiterBasisPoints") / 10000)::INTEGER
      ),
    CONSTRAINT "revenue_allocations_platform_residual_check"
      CHECK ("platformAmountMinor" = "grossAmountMinor" - "recruiterAmountMinor"),
    CONSTRAINT "revenue_allocations_currency_uppercase_check"
      CHECK ("currency" = UPPER("currency") AND "currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "revenue_allocations_status_timestamps_check"
      CHECK (
        ("status" = 'pending' AND "availableAt" IS NULL AND "reversedAt" IS NULL)
        OR ("status" = 'available' AND "availableAt" IS NOT NULL AND "reversedAt" IS NULL)
        OR ("status" = 'reversed' AND "reversedAt" IS NOT NULL)
      )
);

CREATE TABLE "placement_revenue_ledger_entries" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "kind" "revenue_ledger_entry_kind" NOT NULL,
    "recruiterAmountMinor" INTEGER NOT NULL,
    "platformAmountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_revenue_ledger_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "revenue_ledger_amount_sign_check"
      CHECK (
        ("kind" = 'allocation' AND "recruiterAmountMinor" >= 0 AND "platformAmountMinor" >= 0)
        OR ("kind" = 'reversal' AND "recruiterAmountMinor" <= 0 AND "platformAmountMinor" <= 0)
      ),
    CONSTRAINT "revenue_ledger_currency_uppercase_check"
      CHECK ("currency" = UPPER("currency") AND "currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "marketplace_placements_application_key"
  ON "marketplace_placements"("applicationId");
CREATE UNIQUE INDEX "marketplace_placements_client_application_key"
  ON "marketplace_placements"("clientId", "applicationId");
CREATE UNIQUE INDEX "marketplace_placements_tenant_id_key"
  ON "marketplace_placements"("workspaceId", "clientId", "recruiterUserId", "id");
CREATE INDEX "marketplace_placements_workspaceId_clientId_createdAt_idx"
  ON "marketplace_placements"("workspaceId", "clientId", "createdAt");
CREATE INDEX "marketplace_placements_recruiterUserId_createdAt_idx"
  ON "marketplace_placements"("recruiterUserId", "createdAt");

CREATE UNIQUE INDEX "revenue_allocations_placement_key"
  ON "placement_revenue_allocations"("placementId");
CREATE UNIQUE INDEX "revenue_allocations_placement_tenant_key"
  ON "placement_revenue_allocations"("workspaceId", "clientId", "recruiterUserId", "placementId");
CREATE UNIQUE INDEX "revenue_allocations_id_currency_key"
  ON "placement_revenue_allocations"("id", "currency");
CREATE INDEX "revenue_allocations_workspace_client_created_idx"
  ON "placement_revenue_allocations"("workspaceId", "clientId", "createdAt");
CREATE INDEX "placement_revenue_allocations_recruiterUserId_createdAt_idx"
  ON "placement_revenue_allocations"("recruiterUserId", "createdAt");

CREATE UNIQUE INDEX "revenue_ledger_allocation_kind_key"
  ON "placement_revenue_ledger_entries"("allocationId", "kind");
CREATE INDEX "placement_revenue_ledger_entries_createdAt_idx"
  ON "placement_revenue_ledger_entries"("createdAt");

ALTER TABLE "marketplace_placements"
  ADD CONSTRAINT "marketplace_placements_workspace_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "marketplace_placements"
  ADD CONSTRAINT "marketplace_placements_workspace_client_fkey"
  FOREIGN KEY ("workspaceId", "clientId") REFERENCES "Client"("workspaceId", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "marketplace_placements"
  ADD CONSTRAINT "marketplace_placements_client_application_fkey"
  FOREIGN KEY ("clientId", "applicationId") REFERENCES "candidate_applications"("clientId", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "marketplace_placements"
  ADD CONSTRAINT "marketplace_placements_recruiter_user_fkey"
  FOREIGN KEY ("recruiterUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "marketplace_placements"
  ADD CONSTRAINT "marketplace_placements_workspace_recruiter_fkey"
  FOREIGN KEY ("workspaceId", "recruiterUserId") REFERENCES "WorkspaceMembership"("workspaceId", "userId")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "placement_revenue_allocations"
  ADD CONSTRAINT "revenue_allocations_workspace_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "placement_revenue_allocations"
  ADD CONSTRAINT "revenue_allocations_workspace_client_fkey"
  FOREIGN KEY ("workspaceId", "clientId") REFERENCES "Client"("workspaceId", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "placement_revenue_allocations"
  ADD CONSTRAINT "revenue_allocations_placement_tenant_fkey"
  FOREIGN KEY ("workspaceId", "clientId", "recruiterUserId", "placementId")
  REFERENCES "marketplace_placements"("workspaceId", "clientId", "recruiterUserId", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "placement_revenue_allocations"
  ADD CONSTRAINT "revenue_allocations_recruiter_user_fkey"
  FOREIGN KEY ("recruiterUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "placement_revenue_allocations"
  ADD CONSTRAINT "revenue_allocations_workspace_recruiter_fkey"
  FOREIGN KEY ("workspaceId", "recruiterUserId") REFERENCES "WorkspaceMembership"("workspaceId", "userId")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "placement_revenue_ledger_entries"
  ADD CONSTRAINT "revenue_ledger_allocation_currency_fkey"
  FOREIGN KEY ("allocationId", "currency")
  REFERENCES "placement_revenue_allocations"("id", "currency")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE FUNCTION validate_revenue_ledger_amounts() RETURNS TRIGGER AS $$
DECLARE
    allocation_record "placement_revenue_allocations"%ROWTYPE;
BEGIN
    SELECT * INTO allocation_record
      FROM "placement_revenue_allocations"
     WHERE "id" = NEW."allocationId";

    IF (NEW."kind" = 'allocation' AND (
      NEW."recruiterAmountMinor" < 0 OR NEW."platformAmountMinor" < 0
    )) OR (NEW."kind" = 'reversal' AND (
      NEW."recruiterAmountMinor" > 0 OR NEW."platformAmountMinor" > 0
    )) THEN
      RAISE EXCEPTION 'revenue_ledger_amount_sign_check'
        USING ERRCODE = '23514',
              CONSTRAINT = 'revenue_ledger_amount_sign_check';
    END IF;

    IF FOUND AND (
      (NEW."kind" = 'allocation' AND (
        NEW."recruiterAmountMinor" <> allocation_record."recruiterAmountMinor"
        OR NEW."platformAmountMinor" <> allocation_record."platformAmountMinor"
      ))
      OR (NEW."kind" = 'reversal' AND (
        NEW."recruiterAmountMinor" <> -allocation_record."recruiterAmountMinor"
        OR NEW."platformAmountMinor" <> -allocation_record."platformAmountMinor"
      ))
    ) THEN
      RAISE EXCEPTION 'revenue_ledger_amounts_match_allocation_check'
        USING ERRCODE = '23514',
              CONSTRAINT = 'revenue_ledger_amounts_match_allocation_check';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_revenue_ledger_amounts_before_insert
BEFORE INSERT ON "placement_revenue_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION validate_revenue_ledger_amounts();

CREATE FUNCTION prevent_revenue_allocation_financial_mutation() RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
      SELECT 1
        FROM "placement_revenue_ledger_entries"
       WHERE "allocationId" = OLD."id"
    ) AND (
      NEW."workspaceId" IS DISTINCT FROM OLD."workspaceId"
      OR NEW."clientId" IS DISTINCT FROM OLD."clientId"
      OR NEW."placementId" IS DISTINCT FROM OLD."placementId"
      OR NEW."recruiterUserId" IS DISTINCT FROM OLD."recruiterUserId"
      OR NEW."currency" IS DISTINCT FROM OLD."currency"
      OR NEW."grossAmountMinor" IS DISTINCT FROM OLD."grossAmountMinor"
      OR NEW."recruiterBasisPoints" IS DISTINCT FROM OLD."recruiterBasisPoints"
      OR NEW."platformBasisPoints" IS DISTINCT FROM OLD."platformBasisPoints"
      OR NEW."recruiterAmountMinor" IS DISTINCT FROM OLD."recruiterAmountMinor"
      OR NEW."platformAmountMinor" IS DISTINCT FROM OLD."platformAmountMinor"
    ) THEN
      RAISE EXCEPTION 'revenue_allocation_financial_fields_immutable'
        USING ERRCODE = '23514',
              CONSTRAINT = 'revenue_allocation_financial_fields_immutable';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_revenue_allocation_financial_update
BEFORE UPDATE ON "placement_revenue_allocations"
FOR EACH ROW EXECUTE FUNCTION prevent_revenue_allocation_financial_mutation();

CREATE FUNCTION prevent_revenue_ledger_entry_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'revenue_ledger_entries_append_only'
      USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_revenue_ledger_entry_update_or_delete
BEFORE UPDATE OR DELETE ON "placement_revenue_ledger_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_revenue_ledger_entry_mutation();
