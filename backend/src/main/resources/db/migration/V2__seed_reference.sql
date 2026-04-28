-- Seed reference data: skill categories, languages, credit packages
-- Idempotent via ON CONFLICT.

INSERT INTO skill_categories (id, code, display_name, sort_order) VALUES
    (1,  'COOKING',         'Cooking (general)',     10),
    (2,  'COOKING_CHINESE', 'Cooking (Chinese)',     11),
    (3,  'COOKING_HALAL',   'Cooking (Halal)',       12),
    (4,  'COOKING_INDIAN',  'Cooking (Indian)',      13),
    (5,  'CLEANING',        'General cleaning',      20),
    (6,  'LAUNDRY',         'Laundry',               21),
    (7,  'IRONING',         'Ironing',               22),
    (8,  'INFANT_CARE',     'Infant care',           30),
    (9,  'CHILDCARE',       'Childcare',             31),
    (10, 'TUTORING',        'Tutoring',              32),
    (11, 'ELDERLY_CARE',    'Elderly care',          40),
    (12, 'DISABILITY_CARE', 'Disability care',       41),
    (13, 'PET_CARE',        'Pet care',              50),
    (14, 'GARDENING',       'Gardening',             60),
    (15, 'DRIVING',         'Driving',               70),
    (16, 'MARKETING',       'Marketing / groceries', 80)
ON CONFLICT (id) DO NOTHING;

INSERT INTO languages (id, iso_code, display_name) VALUES
    (1, 'en',  'English'),
    (2, 'zh',  'Mandarin Chinese'),
    (3, 'yue', 'Cantonese'),
    (4, 'ms',  'Malay'),
    (5, 'id',  'Bahasa Indonesia'),
    (6, 'tl',  'Tagalog / Filipino'),
    (7, 'my',  'Burmese'),
    (8, 'ta',  'Tamil'),
    (9, 'hi',  'Hindi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO credit_packages (id, code, role, credits, price_sgd_cents, is_active) VALUES
    (1, 'EMP_STARTER',  'EMPLOYER', 1,  1200, true),
    (2, 'EMP_PACK_5',   'EMPLOYER', 5,  5000, true),
    (3, 'EMP_PACK_10',  'EMPLOYER', 10, 9000, true),
    (4, 'HLP_STARTER',  'HELPER',   1,   200, true),
    (5, 'HLP_PACK_5',   'HELPER',   5,   800, true),
    (6, 'HLP_PACK_10',  'HELPER',  10,  1500, true)
ON CONFLICT (id) DO NOTHING;
