-- Recurring daily todo templates and template linkage on todos

CREATE TABLE todo_templates (
    id           UUID         PRIMARY KEY,
    placement_id UUID         NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    description  VARCHAR(500) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_todo_templates_placement ON todo_templates(placement_id, sort_order);

ALTER TABLE todos
    ADD COLUMN template_id UUID REFERENCES todo_templates(id) ON DELETE SET NULL,
    ADD COLUMN sort_order  INT;
