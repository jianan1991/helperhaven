package com.helperhaven.matches;

import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.matches.dto.MatchView;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.Period;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Sprint A matching: dot product of the employer's weight vector against each
 * helper's score vector. Both vectors sum to 100, so the raw dot product lives
 * in [0, 10000]; we divide by 100 to surface a 0-100 percentage.
 *
 * <p>Why a dot product rather than something fancier? It captures "did the
 * employer's priorities line up with the helper's strengths" with one cheap
 * arithmetic step, which is exactly the demo we need to ship. Sprint B layers
 * cohort fit (age, languages, location) on top.
 */
@Service
public class MatchService {

    private static final Duration PHOTO_GET_TTL = Duration.ofHours(1);

    /** Cap the list size so we don't ship a huge payload during the demo. */
    private static final int MATCH_LIMIT = 50;

    private final UserRepository users;
    private final EmployerProfileRepository employers;
    private final HelperProfileRepository helpers;
    private final FileStorage storage;

    public MatchService(
            UserRepository users,
            EmployerProfileRepository employers,
            HelperProfileRepository helpers,
            FileStorage storage
    ) {
        this.users = users;
        this.employers = employers;
        this.helpers = helpers;
        this.storage = storage;
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

        return helpers.findAllScored().stream()
                .map(h -> toEmployerView(h, w))
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

        return employers.findAll().stream()
                .filter(MatchService::hasFullWeights)
                .map(e -> toHelperView(e, s))
                .sorted(Comparator.comparingDouble(MatchView::score).reversed())
                .limit(MATCH_LIMIT)
                .toList();
    }

    private MatchView toEmployerView(HelperProfile h, int[] employerWeights) {
        int[] hs = vec(h.getScoreInfant(), h.getScoreElderly(),
                h.getScoreCooking(), h.getScoreHouse(), h.getScoreAttitude());
        double score = dotPercent(employerWeights, hs);
        return new MatchView(
                h.getUserId(),
                h.getDisplayFirstName(),
                String.valueOf(h.getNationality()),
                ageOrNull(h.getDateOfBirth()),
                h.getYearsExperience() == null ? null : h.getYearsExperience().intValue(),
                h.getBio(),
                signedPhoto(h.getPhotoUrl()),
                round1(score),
                top3Reasons(employerWeights, hs)
        );
    }

    private MatchView toHelperView(EmployerProfile e, int[] helperScores) {
        int[] ew = vec(e.getWeightInfant(), e.getWeightElderly(),
                e.getWeightCooking(), e.getWeightHouse(), e.getWeightAttitude());
        double score = dotPercent(ew, helperScores);
        return new MatchView(
                e.getUserId(),
                e.getFullName() == null ? "Family in " + (e.getDistrict() == null ? "SG" : e.getDistrict()) : e.getFullName(),
                e.getHousing() == null ? null : e.getHousing().name(),
                null,
                null,
                e.getHiringPurpose(),
                null,
                round1(score),
                top3Reasons(helperScores, ew)
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
        return sum / 100.0; // both vectors sum to 100, so range is [0, 10000] -> divide by 100
    }

    /**
     * The three skill keys that contributed the most to the score (i.e. where
     * weight*score is highest). Used by the UI to say "matched on cooking,
     * elderly care, attitude" without dumping the whole vector.
     */
    private static List<String> top3Reasons(int[] weights, int[] scores) {
        String[] keys = { "infant", "elderly", "cooking", "house", "attitude" };
        Integer[] idx = { 0, 1, 2, 3, 4 };
        java.util.Arrays.sort(idx, (a, b) -> Integer.compare(weights[b] * scores[b], weights[a] * scores[a]));
        return List.of(keys[idx[0]], keys[idx[1]], keys[idx[2]]);
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
