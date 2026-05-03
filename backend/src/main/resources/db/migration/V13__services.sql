CREATE TABLE services (
    id            uuid        PRIMARY KEY,
    title         varchar(200) NOT NULL,
    description   varchar(500) NOT NULL,
    icon          varchar(20)  NOT NULL,
    price_sgd     integer      NOT NULL,
    sort_order    integer      NOT NULL DEFAULT 0,
    active        boolean      NOT NULL DEFAULT true
);

INSERT INTO services (id, title, description, icon, price_sgd, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'MOM Work Permit Application',  'We prepare and submit the FDW application to MOM on your behalf.',              '📋', 400, 1),
  ('a1000000-0000-0000-0000-000000000002', 'Insurance & Security Bond',    'FDW insurance and $5,000 security bond arranged and managed for you.',           '🛡️', 290, 2),
  ('a1000000-0000-0000-0000-000000000003', 'Arrival Coordination',         'Airport pickup, SIM card, and settling-in checklist on arrival day.',             '✈️', 180, 3),
  ('a1000000-0000-0000-0000-000000000004', 'SIP Registration',             'We register the helper for the mandatory Settling-In Programme.',                 '🎓', 100, 4),
  ('a1000000-0000-0000-0000-000000000005', 'Medical Exam Booking',         'We book the required medical examination within the legal window.',               '🩺', 120, 5),
  ('a1000000-0000-0000-0000-000000000006', 'Ongoing Support',              'Dedicated case manager reachable via WhatsApp throughout the placement.',         '📞', 150, 6);
