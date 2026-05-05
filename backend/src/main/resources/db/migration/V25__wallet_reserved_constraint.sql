-- Ensure reserved credits never exceed available balance
ALTER TABLE credit_wallets
    ADD CONSTRAINT chk_wallet_reserved_le_balance CHECK (reserved <= balance);
