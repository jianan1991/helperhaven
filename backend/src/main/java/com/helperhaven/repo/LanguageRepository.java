package com.helperhaven.repo;

import com.helperhaven.domain.Language;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LanguageRepository extends JpaRepository<Language, Short> {
    List<Language> findByIsActiveTrueOrderByDisplayName();
}
