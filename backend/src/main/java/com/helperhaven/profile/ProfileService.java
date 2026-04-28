package com.helperhaven.profile;

import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperLanguage;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.profile.dto.EmployerProfileRequest;
import com.helperhaven.profile.dto.EmployerProfileResponse;
import com.helperhaven.profile.dto.FiveVector;
import com.helperhaven.profile.dto.HelperProfileRequest;
import com.helperhaven.profile.dto.HelperProfileResponse;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperLanguageRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.UserRepository;
import com.helperhaven.storage.FileStorage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Reads/upserts helper and employer profiles. Each {@code save*} call is
 * idempotent — onboarding wizards POST the full final state on completion,
 * and editing later just re-POSTs.
 *
 * <p>Invariants enforced here, not in the DB:
 * <ul>
 *   <li>5-vector components sum to exactly 100.</li>
 *   <li>The user role matches the profile being upserted (an EMPLOYER can't
 *       create a helper profile and vice-versa).</li>
 * </ul>
 */
@Service
public class ProfileService {

    /**
     * Long enough that the photo doesn't 403 mid-session, short enough that a
     * leaked URL stops working on its own. We mint a fresh one on every read.
     */
    private static final Duration PHOTO_GET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;
    private final HelperLanguageRepository helperLanguages;
    private final FileStorage storage;

    public ProfileService(
            UserRepository users,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers,
            HelperLanguageRepository helperLanguages,
            FileStorage storage
    ) {
        this.users = users;
        this.helpers = helpers;
        this.employers = employers;
        this.helperLanguages = helperLanguages;
        this.storage = storage;
    }

    @Transactional(readOnly = true)
    public HelperProfileResponse readHelper(UUID userId) {
        HelperProfile p = helpers.findById(userId)
                .orElseThrow(() -> new ProfileException(ProfileError.NOT_FOUND, "No helper profile yet"));
        List<HelperLanguage> langs = helperLanguages.findByIdHelperUserId(userId);
        return HelperProfileResponse.from(p, langs).withPhotoUrl(signedPhoto(p.getPhotoUrl()));
    }

    @Transactional(readOnly = true)
    public EmployerProfileResponse readEmployer(UUID userId) {
        EmployerProfile p = employers.findById(userId)
                .orElseThrow(() -> new ProfileException(ProfileError.NOT_FOUND, "No employer profile yet"));
        return EmployerProfileResponse.from(p);
    }

    @Transactional
    public HelperProfileResponse saveHelper(UUID userId, HelperProfileRequest req) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ProfileException(ProfileError.USER_NOT_FOUND, "Account not found"));
        if (user.getRole() != UserRole.HELPER) {
            throw new ProfileException(ProfileError.WRONG_ROLE, "Only helper accounts can save a helper profile");
        }
        requireSum100(req.skills(), "skills");

        Instant now = Instant.now();
        HelperProfile p = helpers.findById(userId).orElseGet(() -> HelperProfile.builder()
                .userId(userId)
                .availableForTransfer(false)
                .createdAt(now)
                .build());

        p.setDisplayFirstName(req.displayFirstName());
        p.setFullName(req.fullName());
        p.setNationality(req.nationality());
        p.setDateOfBirth(req.dateOfBirth());
        p.setYearsExperience((short) req.yearsExperience().intValue());
        p.setReligion(req.religion());
        p.setMaritalStatus(req.maritalStatus());
        p.setEducation(req.education());
        p.setBio(req.bio());
        p.setHeightCm(req.heightCm() == null ? null : (short) req.heightCm().intValue());
        p.setWeightKg(req.weightKg() == null ? null : (short) req.weightKg().intValue());
        p.setWillingLiveIn(req.willingLiveIn());
        p.setExpectedSalarySgd(req.expectedSalarySgd());
        p.setAvailableFrom(req.availableFrom());
        p.setCurrentLocation(req.currentLocation());
        // Null photoUrl means "leave the existing photo alone" — the wizard
        // sends null on re-save when the user didn't pick a new file.
        if (req.photoUrl() != null) {
            p.setPhotoUrl(req.photoUrl());
        }
        p.setScoreInfant((short) req.skills().infant().intValue());
        p.setScoreElderly((short) req.skills().elderly().intValue());
        p.setScoreCooking((short) req.skills().cooking().intValue());
        p.setScoreHouse((short) req.skills().house().intValue());
        p.setScoreAttitude((short) req.skills().attitude().intValue());
        p.setUpdatedAt(now);

        helpers.save(p);

        // Languages: replace-the-set semantics. Cheap because the table is tiny per user.
        helperLanguages.deleteByIdHelperUserId(userId);
        if (req.languages() != null) {
            for (var entry : req.languages()) {
                HelperLanguage row = HelperLanguage.builder()
                        .id(new HelperLanguage.Pk(userId, entry.languageId()))
                        .proficiency(entry.proficiency())
                        .updatedAt(now)
                        .build();
                helperLanguages.save(row);
            }
        }

        return HelperProfileResponse.from(p, helperLanguages.findByIdHelperUserId(userId))
                .withPhotoUrl(signedPhoto(p.getPhotoUrl()));
    }

    @Transactional
    public EmployerProfileResponse saveEmployer(UUID userId, EmployerProfileRequest req) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ProfileException(ProfileError.USER_NOT_FOUND, "Account not found"));
        if (user.getRole() != UserRole.EMPLOYER) {
            throw new ProfileException(ProfileError.WRONG_ROLE, "Only employer accounts can save an employer profile");
        }
        requireSum100(req.weights(), "weights");

        Instant now = Instant.now();
        EmployerProfile p = employers.findById(userId).orElseGet(() -> EmployerProfile.builder()
                .userId(userId)
                .createdAt(now)
                .build());

        p.setFullName(req.fullName());
        p.setHouseholdSize((short) req.householdSize().intValue());
        p.setNumChildren((short) req.numChildren().intValue());
        p.setNumElderly((short) req.numElderly().intValue());
        p.setHasPets(req.hasPets());
        p.setHousing(req.housing());
        p.setDistrict(req.district());
        p.setSalaryOfferSgdMin(req.salaryOfferSgdMin());
        p.setSalaryOfferSgdMax(req.salaryOfferSgdMax());
        p.setOffDayPolicy(req.offDayPolicy());
        p.setHiringPurpose(req.hiringPurpose());
        p.setPurposeTags(req.purposeTags() == null ? new String[0] : req.purposeTags().toArray(String[]::new));
        p.setWeightInfant((short) req.weights().infant().intValue());
        p.setWeightElderly((short) req.weights().elderly().intValue());
        p.setWeightCooking((short) req.weights().cooking().intValue());
        p.setWeightHouse((short) req.weights().house().intValue());
        p.setWeightAttitude((short) req.weights().attitude().intValue());
        p.setUpdatedAt(now);

        employers.save(p);
        return EmployerProfileResponse.from(p);
    }

    /**
     * Convert a stored photo key into a fresh short-TTL signed URL. Returns
     * null if no photo was set, and falls back to the raw value if it looks
     * like an absolute URL — useful in tests/seeds that pre-populate full URLs.
     */
    private String signedPhoto(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) return null;
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) return keyOrUrl;
        return storage.signedGetUrl(keyOrUrl, PHOTO_GET_TTL);
    }

    private static void requireSum100(FiveVector v, String field) {
        if (v.sum() != 100) {
            throw new ProfileException(ProfileError.VECTOR_NOT_100,
                    "The " + field + " must sum to exactly 100 (got " + v.sum() + ")");
        }
    }

    public enum ProfileError { NOT_FOUND, USER_NOT_FOUND, WRONG_ROLE, VECTOR_NOT_100 }

    public static class ProfileException extends RuntimeException {
        private final ProfileError error;
        public ProfileException(ProfileError error, String message) {
            super(message);
            this.error = error;
        }
        public ProfileError error() { return error; }
    }
}
