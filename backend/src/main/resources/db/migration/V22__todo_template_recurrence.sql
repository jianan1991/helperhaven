-- Add recurrence type to todo templates and propagate to materialized todos

ALTER TABLE todo_templates
  ADD COLUMN recurrence_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
  ADD COLUMN days_of_week    INTEGER;   -- bitmask for WEEKLY: bit 0=Mon … bit 6=Sun

ALTER TABLE todos
  ADD COLUMN recurrence_type VARCHAR(20); -- copied from template at materialisation time
