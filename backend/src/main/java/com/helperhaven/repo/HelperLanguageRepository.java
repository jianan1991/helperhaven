package com.helperhaven.repo;

import com.helperhaven.domain.HelperLanguage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HelperLanguageRepository extends JpaRepository<HelperLanguage, HelperLanguage.Pk> {
    List<HelperLanguage> findByIdHelperUserId(UUID helperUserId);
    void deleteByIdHelperUserId(UUID helperUserId);
}
