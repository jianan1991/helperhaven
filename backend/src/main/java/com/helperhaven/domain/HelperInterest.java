package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "helper_interests")
@IdClass(HelperInterest.PK.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HelperInterest {

    @Id
    @Column(name = "helper_id")
    private UUID helperId;

    @Id
    @Column(name = "employer_id")
    private UUID employerId;

    @Column(name = "expressed_at", nullable = false)
    private Instant expressedAt;

    // JPA @IdClass requires a no-arg constructor, equals, hashCode, and Serializable.
    // Records lack the no-arg constructor so we use a plain static class here.
    public static class PK implements Serializable {
        private UUID helperId;
        private UUID employerId;

        public PK() {}
        public PK(UUID helperId, UUID employerId) {
            this.helperId = helperId;
            this.employerId = employerId;
        }

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(helperId, pk.helperId) && Objects.equals(employerId, pk.employerId);
        }
        @Override public int hashCode() { return Objects.hash(helperId, employerId); }
    }
}
