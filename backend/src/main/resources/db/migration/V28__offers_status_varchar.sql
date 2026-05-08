-- Revert offers.status from PostgreSQL custom enum back to varchar.
-- Hibernate 6 binds @Enumerated(EnumType.STRING) parameters as VARCHAR; PostgreSQL
-- rejects the implicit cast to a custom enum type, causing offer INSERT/SELECT to fail.
-- Java-level type safety via OfferStatus enum is sufficient.
ALTER TABLE offers
    ALTER COLUMN status TYPE varchar
    USING status::varchar;

ALTER TABLE offers
    ALTER COLUMN status SET DEFAULT 'PENDING';

DROP TYPE IF EXISTS offer_status;
