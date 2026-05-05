-- Add the signup credit-grant reason so employer signups are auditable
ALTER TYPE credit_reason ADD VALUE IF NOT EXISTS 'SIGNUP_GRANT';
