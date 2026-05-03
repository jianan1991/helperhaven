package com.helperhaven.config;

import com.helperhaven.domain.CreditWallet;
import com.helperhaven.domain.EmployerProfile;
import com.helperhaven.domain.HelperProfile;
import com.helperhaven.domain.Language;
import com.helperhaven.domain.User;
import com.helperhaven.domain.enums.HousingType;
import com.helperhaven.domain.enums.Nationality;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.domain.enums.UserStatus;
import com.helperhaven.repo.CreditWalletRepository;
import com.helperhaven.repo.EmployerProfileRepository;
import com.helperhaven.repo.HelperProfileRepository;
import com.helperhaven.repo.LanguageRepository;
import com.helperhaven.repo.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@Profile("local")
public class LocalSeedRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalSeedRunner.class);

    static final String ADMIN_EMAIL    = "admin@helperhaven.local";
    static final String ADMIN_PASSWORD = "Admin12345!";
    static final String HELPER_EMAIL    = "helper@helperhaven.local";
    static final String HELPER_PASSWORD = "Helper12345!";
    static final String EMPLOYER_EMAIL    = "family@helperhaven.local";
    static final String EMPLOYER_PASSWORD = "Family12345!";

    private final UserRepository users;
    private final CreditWalletRepository wallets;
    private final HelperProfileRepository helperProfiles;
    private final EmployerProfileRepository employerProfiles;
    private final LanguageRepository languages;
    private final PasswordEncoder encoder;

    public LocalSeedRunner(
            UserRepository users,
            CreditWalletRepository wallets,
            HelperProfileRepository helperProfiles,
            EmployerProfileRepository employerProfiles,
            LanguageRepository languages,
            PasswordEncoder encoder
    ) {
        this.users = users;
        this.wallets = wallets;
        this.helperProfiles = helperProfiles;
        this.employerProfiles = employerProfiles;
        this.languages = languages;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        seedLanguages();

        User admin    = seedUser(ADMIN_EMAIL,    ADMIN_PASSWORD,    UserRole.ADMIN,    false);
        User helper1  = seedUser(HELPER_EMAIL,   HELPER_PASSWORD,   UserRole.HELPER,   false);
        User helper2  = seedUser("wati@helperhaven.local",   "Helper12345!", UserRole.HELPER, false);
        User helper3  = seedUser("sukyi@helperhaven.local",  "Helper12345!", UserRole.HELPER, false);
        User helper4  = seedUser("rose@helperhaven.local",   "Helper12345!", UserRole.HELPER, false);
        User employer = seedUser(EMPLOYER_EMAIL, EMPLOYER_PASSWORD, UserRole.EMPLOYER, true);

        seedHelperProfile(helper1,
                "Maria", "Maria Santos", Nationality.PHL,
                LocalDate.of(1991, 6, 15), (short) 6,
                "Catholic", "Single",
                "Warm, patient helper with 6 years caring for young families in Singapore. "
                + "Comfortable with infant care, cooking Filipino and Chinese dishes, and keeping a tidy home. "
                + "Live-in preferred.",
                (short) 35, (short) 15, (short) 25, (short) 15, (short) 10,
                700, true,
                "[{\"id\":\"m1\",\"country\":\"SG\",\"location\":\"Tampines\",\"startDate\":\"2021-03\",\"endDate\":\"\",\"isCurrent\":true,\"description\":\"Live-in helper for a young couple with a 2-year-old and newborn. Responsible for all infant care, meal prep, and housekeeping.\",\"duties\":[\"infant_care\",\"child_care\",\"cooking\",\"housekeeping\"],\"leftBecause\":\"\"},"
                + "{\"id\":\"m2\",\"country\":\"SG\",\"location\":\"Queenstown\",\"startDate\":\"2018-06\",\"endDate\":\"2021-02\",\"isCurrent\":false,\"description\":\"Worked with a family of 4. Managed daily cooking of Filipino and Chinese dishes, school runs, and grocery shopping.\",\"duties\":[\"cooking\",\"child_care\",\"school_runs\",\"grocery\"],\"leftBecause\":\"Family relocated to Malaysia\"}]");

        seedHelperProfile(helper2,
                "Wati", "Wati Susanti", Nationality.IDN,
                LocalDate.of(1988, 3, 22), (short) 9,
                "Muslim", "Married",
                "Experienced caregiver with 9 years specialising in elderly care and rehabilitation support. "
                + "Holds a basic nursing aide certificate. Fluent in Malay and basic English. "
                + "Gentle and patient — ideal for households with seniors or mobility challenges.",
                (short) 10, (short) 40, (short) 20, (short) 20, (short) 10,
                750, false,
                "[{\"id\":\"w1\",\"country\":\"SG\",\"location\":\"Clementi\",\"startDate\":\"2019-08\",\"endDate\":\"\",\"isCurrent\":true,\"description\":\"Full-time caregiver for an 82-year-old grandmother with limited mobility. Assists with bathing, medication, physiotherapy exercises, and meal preparation.\",\"duties\":[\"elderly_care\",\"medication\",\"cooking\"],\"leftBecause\":\"\"},"
                + "{\"id\":\"w2\",\"country\":\"SG\",\"location\":\"Jurong West\",\"startDate\":\"2015-01\",\"endDate\":\"2019-07\",\"isCurrent\":false,\"description\":\"Cared for an elderly couple (both in their 70s) including dementia support for one family member. Managed housekeeping and daily meals.\",\"duties\":[\"elderly_care\",\"dementia\",\"cooking\",\"housekeeping\"],\"leftBecause\":\"Employer passed away\"}]");

        seedHelperProfile(helper3,
                "Su Kyi", "Su Kyi Win", Nationality.MMR,
                LocalDate.of(1994, 11, 8), (short) 4,
                "Buddhist", "Single",
                "Enthusiastic cook who can prepare Chinese, Thai, and Western dishes from scratch. "
                + "4 years experience with a family of 5 in Singapore including school runs and grocery shopping. "
                + "Looking for a household where she can grow her cooking skills.",
                (short) 15, (short) 10, (short) 45, (short) 20, (short) 10,
                650, true,
                "[{\"id\":\"s1\",\"country\":\"SG\",\"location\":\"Bishan\",\"startDate\":\"2020-06\",\"endDate\":\"\",\"isCurrent\":true,\"description\":\"Live-in helper for a family of 5 with three children aged 3–10. Cook Chinese and Western meals daily, manage school runs, grocery shopping, and general housekeeping.\",\"duties\":[\"cooking\",\"child_care\",\"school_runs\",\"grocery\",\"housekeeping\"],\"leftBecause\":\"\"},"
                + "{\"id\":\"s2\",\"country\":\"MM\",\"location\":\"Yangon\",\"startDate\":\"2018-01\",\"endDate\":\"2020-04\",\"isCurrent\":false,\"description\":\"Domestic helper for a local family in Yangon. Managed full household duties including cooking traditional Myanmar and Chinese dishes.\",\"duties\":[\"cooking\",\"housekeeping\"],\"leftBecause\":\"Moved to Singapore for better opportunities\"}]");

        seedHelperProfile(helper4,
                "Rose", "Rose Dela Cruz", Nationality.PHL,
                LocalDate.of(1986, 9, 5), (short) 12,
                "Catholic", "Married",
                "12-year veteran helper currently on transfer. Highly adaptable and reliable — has worked with "
                + "infants, elderly grandparents, and large households. Excellent English, driving licence holder. "
                + "References available on request.",
                (short) 25, (short) 25, (short) 20, (short) 20, (short) 10,
                850, true,
                "[{\"id\":\"r1\",\"country\":\"SG\",\"location\":\"Holland Village\",\"startDate\":\"2019-09\",\"endDate\":\"\",\"isCurrent\":true,\"description\":\"Cares for a landed property household with 2 children and an elderly grandparent. Handles infant care, elderly assistance, cooking, and driving the children to school.\",\"duties\":[\"infant_care\",\"elderly_care\",\"cooking\",\"school_runs\",\"driving\",\"housekeeping\"],\"leftBecause\":\"\"},"
                + "{\"id\":\"r2\",\"country\":\"HK\",\"location\":\"Kowloon\",\"startDate\":\"2014-02\",\"endDate\":\"2019-08\",\"isCurrent\":false,\"description\":\"5 years with a Hong Kong family. Managed infant and child care for two kids, cooked Chinese meals, and maintained a large apartment.\",\"duties\":[\"infant_care\",\"child_care\",\"cooking\",\"housekeeping\"],\"leftBecause\":\"Family returned to Philippines\"},"
                + "{\"id\":\"r3\",\"country\":\"SG\",\"location\":\"Orchard\",\"startDate\":\"2012-05\",\"endDate\":\"2014-01\",\"isCurrent\":false,\"description\":\"First job in Singapore. Worked for an expat family with one toddler. General housekeeping and child minding.\",\"duties\":[\"child_care\",\"housekeeping\"],\"leftBecause\":\"Contract ended\"}]");

        seedEmployerProfile(employer);

        log.info("[seed] ──────────────────────────────────────────────");
        log.info("[seed] Local demo accounts");
        log.info("[seed]   ADMIN    {}  /  {}", ADMIN_EMAIL, ADMIN_PASSWORD);
        log.info("[seed]   FAMILY   {}  /  {}", EMPLOYER_EMAIL, EMPLOYER_PASSWORD);
        log.info("[seed]   HELPER 1 {}  /  {}", HELPER_EMAIL, HELPER_PASSWORD);
        log.info("[seed]   HELPER 2 wati@helperhaven.local   /  Helper12345!");
        log.info("[seed]   HELPER 3 sukyi@helperhaven.local  /  Helper12345!");
        log.info("[seed]   HELPER 4 rose@helperhaven.local   /  Helper12345!");
        log.info("[seed] ──────────────────────────────────────────────");
    }

    // ---- languages -------------------------------------------------------

    private void seedLanguages() {
        if (languages.count() > 0) return;
        languages.saveAll(List.of(
                lang((short) 1, "en",  "English",            true),
                lang((short) 2, "zh",  "Mandarin",           true),
                lang((short) 3, "id",  "Bahasa Indonesia",   true),
                lang((short) 4, "fil", "Filipino / Tagalog", true),
                lang((short) 5, "my",  "Myanmar (Burmese)",  true),
                lang((short) 6, "ta",  "Tamil",              true),
                lang((short) 7, "ms",  "Malay",              true)
        ));
    }

    private static Language lang(short id, String iso, String display, boolean active) {
        Language l = new Language();
        l.setId(id);
        l.setIsoCode(iso);
        l.setDisplayName(display);
        l.setIsActive(active);
        return l;
    }

    // ---- users -----------------------------------------------------------

    private User seedUser(String email, String password, UserRole role, boolean withWallet) {
        return users.findByEmail(email).orElseGet(() -> {
            Instant now = Instant.now();
            User u = users.save(User.builder()
                    .id(UUID.randomUUID())
                    .email(email)
                    .passwordHash(encoder.encode(password))
                    .role(role)
                    .status(UserStatus.ACTIVE)
                    .locale("en")
                    .emailVerifiedAt(now)
                    .createdAt(now)
                    .build());
            if (withWallet) {
                wallets.save(CreditWallet.builder()
                        .userId(u.getId())
                        .balance(99)
                        .reserved(0)
                        .updatedAt(now)
                        .build());
            }
            return u;
        });
    }

    // ---- profiles --------------------------------------------------------

    private void seedHelperProfile(
            User user,
            String firstName, String fullName, Nationality nationality,
            LocalDate dob, short yearsExp,
            String religion, String maritalStatus,
            String bio,
            short scoreInfant, short scoreElderly, short scoreCooking,
            short scoreHouse, short scoreAttitude,
            int expectedSalary, boolean willingLiveIn,
            String workHistoryJson
    ) {
        if (helperProfiles.existsById(user.getId())) return;
        Instant now = Instant.now();
        helperProfiles.save(HelperProfile.builder()
                .userId(user.getId())
                .displayFirstName(firstName)
                .fullName(fullName)
                .nationality(nationality)
                .dateOfBirth(dob)
                .yearsExperience(yearsExp)
                .religion(religion)
                .maritalStatus(maritalStatus)
                .bio(bio)
                .willingLiveIn(willingLiveIn)
                .expectedSalarySgd(expectedSalary)
                .currentLocation("Singapore")
                .scoreInfant(scoreInfant)
                .scoreElderly(scoreElderly)
                .scoreCooking(scoreCooking)
                .scoreHouse(scoreHouse)
                .scoreAttitude(scoreAttitude)
                .availableForTransfer(false)
                .availableFrom(LocalDate.now().plusDays(14))
                .workHistory(workHistoryJson != null ? workHistoryJson : "[]")
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    private void seedEmployerProfile(User employer) {
        Instant now = Instant.now();
        EmployerProfile p = employerProfiles.findById(employer.getId()).orElseGet(() ->
                EmployerProfile.builder()
                        .userId(employer.getId())
                        .createdAt(now)
                        .build());
        p.setFullName("The Tan Family");
        p.setHouseholdSize((short) 4);
        p.setNumChildren((short) 2);
        p.setNumElderly((short) 0);
        p.setHasPets(false);
        p.setHousing(HousingType.HDB);
        p.setDistrict("Bishan");
        p.setSalaryOfferSgdMin(650);
        p.setSalaryOfferSgdMax(800);
        p.setOffDayPolicy("One full Sunday per week");
        p.setHiringPurpose("Looking for a caring helper to assist with our two young children (ages 1 and 3) "
                + "and help keep our home tidy. Cooking simple meals is a plus.");
        p.setPurposeTags(new String[]{"infant_care", "toddler_care", "cooking", "housekeeping", "school_runs"});
        p.setPreferredLanguages(new String[]{"English", "Mandarin"});
        p.setWeightInfant((short) 40);
        p.setWeightElderly((short) 5);
        p.setWeightCooking((short) 25);
        p.setWeightHouse((short) 20);
        p.setWeightAttitude((short) 10);
        p.setUpdatedAt(now);
        employerProfiles.save(p);
    }
}
