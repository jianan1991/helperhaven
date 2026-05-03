CREATE TABLE placement_services (
    placement_id  uuid    NOT NULL,
    service_id    uuid    NOT NULL,
    price_sgd     integer NOT NULL,
    PRIMARY KEY (placement_id, service_id),
    CONSTRAINT fk_ps_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE CASCADE,
    CONSTRAINT fk_ps_service   FOREIGN KEY (service_id)   REFERENCES services(id)
);
