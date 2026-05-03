package com.helperhaven.matches;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperInterest;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.ConversationStatus;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import com.helperhaven.matches.dto.MatchView;
import com.helperhaven.profile.dto.WorkEntryDto;
import com.helperhaven.repo.ConversationRepository;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperInterestRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MatchService {

    private static final Duration PHOTO_GET_TTL = Duration.ofHours(1);
    private static final Duration INTEREST_TTL = Duration.ofDays(7);

    private static final int MATCH_LIMIT = 50;

    private final UserRepository users;
    private final EmployerProfileRepository employers;
    private final HelperProfileRepository helpers;
    private final ConversationRepository conversations;
    private final HelperInterestRepository interests;
    private final FileStorage storage;
    private final ObjectMapper objectMapper;

    public MatchService(
            UserRepository users,
            EmployerProfileRepository employers,
            HelperProfileRepository helpers,
            ConversationRepository conversations,
            HelperInterestRepository interests,
            FileStorage storage,
            ObjectMapper objectMapper
    ) {
        this.users = users;
        this.employers = employers;
        this.helpers = helpers;
        this.conversations = conversations;
        this.interests = interests;
        this.storage = storage;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MatchView> matchesForCurrentUser(UUID userId) {
        User u = users.findById(userId)
                .orElseThrow(() -> new MatchException(MatchError.USER_NOT_FOUND, "Account not found"));

        if (u.getRole() == UserRole.EMPLOYER) return forEmployer(userId);
        if (u.getRole() == UserRole.HELPER) return forHelper(userId);

        throw new MatchException(MatchError.WRONG_ROLE,
                "Only employers and helpers see matches; admins use the admin console");
    }

    private List<MatchView> forEmployer(UUID employerId) {
        EmployerProfile emp = employers.findById(employerId)
                .orElseThrow(() -> new MatchException(MatchError.PROFILE_NOT_READY,
                        "Finish your profile to see matches"));
        if (!hasFullWeights(emp)) {
            throw new MatchException(MatchError.PROFILE_NOT_READY,
                    "Set your match weights to see matches");
        }

        int[] w = vec(emp.getWeightInfant(), emp.getWeightElderly(),
                emp.getWeightCooking(), emp.getWeightHouse(), emp.getWeightAttitude());

        Instant cutoff = Instant.now().minus(INTEREST_TTL);
        // Map helperId → expiresAt for all helpers who raised their hand for this employer.
        Map<UUID, Instant> interestedHelpers = interests
                .findByEmployerIdAndExpressedAtAfter(employerId, cutoff)
                .stream()
                .collect(Collectors.toMap(HelperInterest::getHelperId,
                        i -> i.getExpressedAt().plus(INTEREST_TTL)));

        return helpers.findAllScored().stream()
                .filter(h -> isActive(h.getUserId()))
                .map(h -> toEmployerView(h, w, employerId, interestedHelpers.get(h.getUserId())))
                .sorted(Comparator.comparingDouble(MatchView::score).reversed())
                .limit(MATCH_LIMIT)
                .toList();
    }

    private List<MatchView> forHelper(UUID helperId) {
        HelperProfile h = helpers.findById(helperId)
                .orElseThrow(() -> new MatchException(MatchError.PROFILE_NOT_READY,
                        "Finish your profile to see matches"));
        if (!hasFullScores(h)) {
            throw new MatchException(MatchError.PROFILE_NOT_READY,
                    "Set your strengths to see matches");
        }

        int[] s = vec(h.getScoreInfant(), h.getScoreElderly(),
                h.getScoreCooking(), h.getScoreHouse(), h.getScoreAttitude());

        Instant cutoff = Instant.now().minus(INTEREST_TTL);
        // Map employerId → expiresAt for all employers this helper raised their hand for.
        Map<UUID, Instant> expressedTo = interests
                .findByHelperIdAndExpressedAtAfter(helperId, cutoff)
                .stream()
                .collect(Collectors.toMap(HelperInterest::getEmployerId,
                        i -> i.getExpressedAt().plus(INTEREST_TTL)));

        return employers.findAll().stream()
                .filter(MatchService::hasFullWeights)
                .filter(e -> isActive(e.getUserId()))
                .map(e -> toHelperView(e, s, expressedTo.get(e.getUserId())))
                .sorted(Comparator.comparingDouble(MatchView::score).reversed())
                .limit(MATCH_LIMIT)
                .toList();
    }

    // expiresAt is non-null only when this helper raised their hand for the employer.
    private MatchView toEmployerView(HelperProfile h, int[] employerWeights, UUID employerId, Instant expiresAt) {
        int[] hs = vec(h.getScoreInfant(), h.getScoreElderly(),
                h.getScoreCooking(), h.getScoreHouse(), h.getScoreAttitude());
        double score = dotPercent(employerWeights, hs);
        boolean unlocked = conversations
                .findOpenBetween(employerId, h.getUserId(), ConversationStatus.OPEN)
                .isPresent();
        return new MatchView(
                h.getUserId(),
                h.getDisplayFirstName(),
                String.valueOf(h.getNationality()),
                ageOrNull(h.getDateOfBirth()),
                h.getYearsExperience() == null ? null : h.getYearsExperience().intValue(),
                h.getWillingLiveIn(),
                h.getExpectedSalarySgd(),
                h.getAvailableFrom(),
                h.getCurrentLocation(),
                parseWorkHistory(h.getWorkHistory()),
                signedPhoto(h.getPhotoUrl()),
                round1(score),
                top3Reasons(employerWeights, hs),
                toScoreMap(hs),
                unlocked,
                expiresAt != null,
                expiresAt,
                h.getBio(),
                Boolean.TRUE.equals(h.getComfortableWithChildren()),
                Boolean.TRUE.equals(h.getComfortableWithPets()),
                Boolean.TRUE.equals(h.getHalal()),
                h.getAllergies(),
                null, null, null, null, null, null, null, null, null, null
        );
    }

    // expiresAt is non-null only when this helper has raised their hand for the employer.
    private MatchView toHelperView(EmployerProfile e, int[] helperScores, Instant expiresAt) {
        int[] ew = vec(e.getWeightInfant(), e.getWeightElderly(),
                e.getWeightCooking(), e.getWeightHouse(), e.getWeightAttitude());
        double score = dotPercent(ew, helperScores);
        return new MatchView(
                e.getUserId(),
                e.getFullName() == null ? "Family in " + (e.getDistrict() == null ? "SG" : e.getDistrict()) : e.getFullName(),
                e.getHousing() == null ? null : e.getHousing().name(),
                null,
                null,
                null, null, null, null, null, // willingLiveIn, expectedSalarySgd, availableFrom, currentLocation, workHistory
                null,
                round1(score),
                top3Reasons(helperScores, ew),
                toScoreMap(ew),
                false,
                expiresAt != null,
                expiresAt,
                e.getHiringPurpose(),
                null, null, null, null,
                e.getHouseholdSize() == null ? null : e.getHouseholdSize().intValue(),
                e.getNumChildren() == null ? null : e.getNumChildren().intValue(),
                e.getNumElderly() == null ? null : e.getNumElderly().intValue(),
                e.getHasPets(),
                e.getDistrict(),
                e.getSalaryOfferSgdMin(),
                e.getSalaryOfferSgdMax(),
                e.getOffDayPolicy(),
                e.getPreferredLanguages() == null ? List.of() : List.of(e.getPreferredLanguages()),
                e.getPurposeTags() == null ? List.of() : List.of(e.getPurposeTags())
        );
    }

    // ---- math + helpers --------------------------------------------------

    private static int[] vec(Short a, Short b, Short c, Short d, Short e) {
        return new int[] { ns(a), ns(b), ns(c), ns(d), ns(e) };
    }

    private static int ns(Short s) { return s == null ? 0 : s.intValue(); }

    private static double dotPercent(int[] x, int[] y) {
        long sum = 0;
        for (int i = 0; i < 5; i++) sum += (long) x[i] * y[i];
        return sum / 100.0;
    }

    private static List<String> top3Reasons(int[] weights, int[] scores) {
        String[] keys = { "infant", "elderly", "cooking", "house", "attitude" };
        Integer[] idx = { 0, 1, 2, 3, 4 };
        java.util.Arrays.sort(idx, (a, b) -> Integer.compare(weights[b] * scores[b], weights[a] * scores[a]));
        return List.of(keys[idx[0]], keys[idx[1]], keys[idx[2]]);
    }

    private static Map<String, Integer> toScoreMap(int[] v) {
        return Map.of(
                "infant",  v[0],
                "elderly", v[1],
                "cooking", v[2],
                "house",   v[3],
                "attitude",v[4]
        );
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static Integer ageOrNull(LocalDate dob) {
        if (dob == null) return null;
        return Period.between(dob, LocalDate.now()).getYears();
    }

    private static boolean hasFullScores(HelperProfile h) {
        return h.getScoreInfant() != null
                && h.getScoreElderly() != null
                && h.getScoreCooking() != null
                && h.getScoreHouse() != null
                && h.getScoreAttitude() != null;
    }

    private static boolean hasFullWeights(EmployerProfile e) {
        return e.getWeightInfant() != null
                && e.getWeightElderly() != null
                && e.getWeightCooking() != null
                && e.getWeightHouse() != null
                && e.getWeightAttitude() != null;
    }

    private List<WorkEntryDto> parseWorkHistory(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private boolean isActive(UUID userId) {
        return users.findById(userId)
                .map(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElse(false);
    }

    private String signedPhoto(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) return null;
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
        return storage.signedGetUrl(keyOrUrl, PHOTO_GET_TTL);
    }

    public enum MatchError { USER_NOT_FOUND, WRONG_ROLE, PROFILE_NOT_READY }

    public static class MatchException extends RuntimeException {
        private final MatchError error;
        public MatchException(MatchError error, String message) {
            super(message);
            this.error = error;
        }
        public MatchError error() { return error; }
    }
}
