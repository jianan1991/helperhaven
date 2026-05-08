-- Allow employers to mark a routine task as applicable even on rest days.
-- Defaults to false — tasks are skipped on rest days unless explicitly opted in.
ALTER TABLE todo_templates
    ADD COLUMN include_on_rest_day boolean NOT NULL DEFAULT false;
