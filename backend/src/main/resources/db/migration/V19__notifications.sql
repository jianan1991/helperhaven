CREATE TABLE notifications (
    id                   uuid         PRIMARY KEY,
    recipient_user_id    uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 varchar(50)  NOT NULL,
    title                varchar(200) NOT NULL,
    body                 varchar(500),
    related_placement_id uuid         REFERENCES placements(id) ON DELETE SET NULL,
    read_at              timestamptz,
    created_at           timestamptz  NOT NULL
);

CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_user_id, created_at DESC);
