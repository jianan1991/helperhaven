package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Helper-language link with self-rated proficiency. Composite PK
 * (helper_user_id, language_id) — one row per helper × language pair.
 */
@Entity
@Table(name = "helper_languages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelperLanguage {

    @EmbeddedId
    private Pk id;

    @Column(nullable = false)
    private Short proficiency;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Pk implements Serializable {
        @Column(name = "helper_user_id", nullable = false)
        private UUID helperUserId;

        @Column(name = "language_id", nullable = false)
        private Short languageId;
    }
}
