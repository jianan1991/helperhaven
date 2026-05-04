-- Active Employment feature: employment dates, rest day, public holidays,
-- leave requests, todos, termination requests

ALTER TABLE placements
    ADD COLUMN employment_start_date date,
    ADD COLUMN employment_end_date    date,
    ADD COLUMN rest_day_of_week       integer; -- 0=Mon … 6=Sun

CREATE TABLE public_holidays (
    id           uuid         PRIMARY KEY,
    holiday_date date         NOT NULL,
    name         varchar(200) NOT NULL,
    created_at   timestamptz  NOT NULL
);
CREATE UNIQUE INDEX uq_public_holidays_date ON public_holidays(holiday_date);

CREATE TABLE leave_requests (
    id                uuid        PRIMARY KEY,
    placement_id      uuid        NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    requester_user_id uuid        NOT NULL,
    type              varchar(30) NOT NULL, -- ANNUAL | MEDICAL | FAMILY_AWAY
    start_date        date        NOT NULL,
    end_date          date        NOT NULL,
    note              varchar(500),
    status            varchar(20) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | DENIED
    responded_at      timestamptz,
    created_at        timestamptz NOT NULL
);
CREATE INDEX idx_leave_requests_placement ON leave_requests(placement_id, start_date);

CREATE TABLE todos (
    id                  uuid         PRIMARY KEY,
    placement_id        uuid         NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    created_by_user_id  uuid         NOT NULL,
    description         varchar(500) NOT NULL,
    due_date            date         NOT NULL,
    completed_at        timestamptz,
    created_at          timestamptz  NOT NULL
);
CREATE INDEX idx_todos_placement_due ON todos(placement_id, due_date);

CREATE TABLE termination_requests (
    id                    uuid          PRIMARY KEY,
    placement_id          uuid          NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    requested_by_user_id  uuid          NOT NULL,
    reason                varchar(1000),
    status                varchar(20)   NOT NULL DEFAULT 'PENDING', -- PENDING | RESOLVED
    admin_notes           varchar(1000),
    created_at            timestamptz   NOT NULL,
    resolved_at           timestamptz
);
CREATE INDEX idx_termination_requests_placement ON termination_requests(placement_id);
