-- Remove the unused "Billing" pay grade and any user rates referencing it.
-- The grade was a leftover from the legacy UserRate.type = 'billing' enum
-- and is not consumed anywhere in application code.

DELETE FROM "user_rates"
WHERE "payGradeId" IN (SELECT "id" FROM "pay_grades" WHERE "code" = 'billing');

DELETE FROM "pay_grades" WHERE "code" = 'billing';
