package com.helperhaven.matches.dto;

import java.util.List;
import java.util.UUID;

/**
 * One row in the matches list. Shape is symmetric across roles — what an
 * employer sees about a helper, and what a helper sees about an employer,
 * both fit this record. Optional fields like {@code age} and {@code photoUrl}
 * are only populated for helper rows.
 */
public record MatchView(
        UUID counterpartyUserId,
        String displayName,
        String subtitle,           // helper: nationality;  employer: housing type
        Integer age,               // helper only
        Integer yearsExperience,   // helper only
        String bio,
        String photoUrl,           // helper only — fresh signed GET URL
        double score,              // 0..100
        List<String> reasons       // top-3 5-vector keys driving the score
) {}
