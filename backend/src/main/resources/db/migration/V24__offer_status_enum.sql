-- Normalise any stale status values before converting the column
UPDATE offers SET status = 'EXPIRED'
WHERE status NOT IN ('PENDING','ACCEPTED','REJECTED','COUNTERED','EXPIRED');

CREATE TYPE offer_status AS ENUM ('PENDING','ACCEPTED','REJECTED','COUNTERED','EXPIRED');

ALTER TABLE offers
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE offer_status USING status::offer_status,
    ALTER COLUMN status SET DEFAULT 'PENDING'::offer_status;

-- Salary must be positive (helper can't accept a zero-pay offer)
ALTER TABLE offers ADD CONSTRAINT chk_offer_salary_positive CHECK (salary_sgd > 0);
