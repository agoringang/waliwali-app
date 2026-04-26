ALTER TABLE "ExpenseParticipant"
ADD COLUMN "shareAmount" INTEGER;

WITH computed_shares AS (
  SELECT
    ep."id",
    FLOOR(e."amount"::numeric / counts.participant_count)::integer +
      CASE
        WHEN counts.participant_rank <= MOD(e."amount", counts.participant_count) THEN 1
        ELSE 0
      END AS share_amount
  FROM "ExpenseParticipant" ep
  INNER JOIN "Expense" e
    ON e."id" = ep."expenseId"
  INNER JOIN (
    SELECT
      inner_ep."id",
      inner_ep."expenseId",
      ROW_NUMBER() OVER (
        PARTITION BY inner_ep."expenseId"
        ORDER BY inner_ep."memberId" ASC
      ) AS participant_rank,
      COUNT(*) OVER (
        PARTITION BY inner_ep."expenseId"
      ) AS participant_count
    FROM "ExpenseParticipant" inner_ep
  ) counts
    ON counts."id" = ep."id"
)
UPDATE "ExpenseParticipant" ep
SET "shareAmount" = computed_shares.share_amount
FROM computed_shares
WHERE computed_shares."id" = ep."id";

ALTER TABLE "ExpenseParticipant"
ALTER COLUMN "shareAmount" SET NOT NULL;
