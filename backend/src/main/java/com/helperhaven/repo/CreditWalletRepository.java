package com.helperhaven.repo;

import com.helperhaven.domain.CreditWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CreditWalletRepository extends JpaRepository<CreditWallet, UUID> {
}
