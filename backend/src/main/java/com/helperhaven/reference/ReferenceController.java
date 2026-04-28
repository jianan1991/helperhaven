package com.helperhaven.reference;

import com.helperhaven.domain.Language;
import com.helperhaven.repo.LanguageRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only reference data the onboarding wizards need: the language picker
 * options and the canonical 5-vector skill keys + display labels.
 *
 * <p>Skill keys are intentionally hard-coded here rather than read from
 * {@code skill_categories} — the 5-vector dimensions are a fixed product
 * decision (infant/elderly/cooking/house/attitude) and changing them would
 * require a schema migration anyway. Returning them from an endpoint keeps the
 * frontend free of magic strings and lets us localise labels later.
 */
@RestController
@RequestMapping("/api/reference")
public class ReferenceController {

    private static final List<SkillOption> SKILLS = List.of(
            new SkillOption("infant",   "Infant care"),
            new SkillOption("elderly",  "Elderly care"),
            new SkillOption("cooking",  "Cooking"),
            new SkillOption("house",    "Housekeeping"),
            new SkillOption("attitude", "Attitude & soft skills")
    );

    private final LanguageRepository languages;

    public ReferenceController(LanguageRepository languages) {
        this.languages = languages;
    }

    @GetMapping("/languages")
    public List<LanguageOption> languages() {
        return languages.findByIsActiveTrueOrderByDisplayName().stream()
                .map(ReferenceController::toOption)
                .toList();
    }

    @GetMapping("/skills")
    public List<SkillOption> skills() {
        return SKILLS;
    }

    private static LanguageOption toOption(Language l) {
        return new LanguageOption(l.getId(), l.getIsoCode(), l.getDisplayName());
    }

    public record LanguageOption(Short id, String isoCode, String displayName) {}

    public record SkillOption(String key, String label) {}
}
