CREATE TABLE placement_documents (
    id             uuid         PRIMARY KEY,
    placement_id   uuid         NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
    uploader_id    uuid         NOT NULL REFERENCES users(id),
    doc_type       varchar(20)  NOT NULL,   -- NRIC_FRONT | NRIC_BACK | NOA
    s3_key         varchar(500) NOT NULL,
    original_name  varchar(255) NOT NULL,
    mime_type      varchar(100) NOT NULL,
    size_bytes     bigint       NOT NULL CHECK (size_bytes >= 0),
    uploaded_at    timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (placement_id, doc_type)
);
CREATE INDEX idx_placement_documents_placement ON placement_documents(placement_id);
