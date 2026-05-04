ALTER TABLE services ADD COLUMN workflow_stage varchar(30);

-- Assign sensible defaults for the seeded services
UPDATE services SET workflow_stage = 'MOM_SUBMITTED'  WHERE id = 'a1000000-0000-0000-0000-000000000001';
UPDATE services SET workflow_stage = 'IPA_ISSUED'     WHERE id = 'a1000000-0000-0000-0000-000000000002';
UPDATE services SET workflow_stage = 'HELPER_ARRIVAL' WHERE id = 'a1000000-0000-0000-0000-000000000003';
UPDATE services SET workflow_stage = 'HELPER_ARRIVAL' WHERE id = 'a1000000-0000-0000-0000-000000000004';
UPDATE services SET workflow_stage = 'HELPER_ARRIVAL' WHERE id = 'a1000000-0000-0000-0000-000000000005';
-- Ongoing Support (id 6) intentionally left NULL — it spans the whole placement
