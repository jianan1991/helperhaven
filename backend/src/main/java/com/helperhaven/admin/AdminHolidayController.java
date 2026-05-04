package com.helperhaven.admin;

import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.PublicHoliday;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.PublicHolidayRepository;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/holidays")
public class AdminHolidayController {

    private final PublicHolidayRepository repo;

    public AdminHolidayController(PublicHolidayRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<HolidayView> list(HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        return repo.findAll().stream()
                .sorted((a, b) -> a.getHolidayDate().compareTo(b.getHolidayDate()))
                .map(h -> new HolidayView(h.getId(), h.getHolidayDate(), h.getName()))
                .toList();
    }

    @PostMapping
    @Transactional
    public HolidayView add(
            @RequestBody AddHolidayRequest req,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }
        if (repo.existsByHolidayDate(req.date())) {
            res.sendError(409, "A holiday already exists on that date");
            return null;
        }
        PublicHoliday h = PublicHoliday.builder()
                .id(UUID.randomUUID())
                .holidayDate(req.date())
                .name(req.name())
                .createdAt(Instant.now())
                .build();
        repo.save(h);
        return new HolidayView(h.getId(), h.getHolidayDate(), h.getName());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable UUID id, HttpServletResponse res) throws IOException {
        if (!isAdmin()) { res.sendError(403); return; }
        repo.deleteById(id);
    }

    /**
     * Excel upload. Expected format: two columns — Column A = date (YYYY-MM-DD or date cell),
     * Column B = holiday name. First row may be a header (skipped if it can't parse as date).
     */
    @PostMapping("/upload")
    @Transactional
    public UploadResult upload(
            @RequestParam("file") MultipartFile file,
            HttpServletResponse res
    ) throws IOException {
        if (!isAdmin()) { res.sendError(403); return null; }

        List<String> errors = new ArrayList<>();
        int added = 0;
        int skipped = 0;

        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();

            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // skip header

                Cell dateCell = row.getCell(0);
                Cell nameCell = row.getCell(1);
                if (dateCell == null || nameCell == null) continue;

                LocalDate date;
                try {
                    if (dateCell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(dateCell)) {
                        date = dateCell.getLocalDateTimeCellValue().toLocalDate();
                    } else {
                        date = LocalDate.parse(fmt.formatCellValue(dateCell).trim());
                    }
                } catch (DateTimeParseException e) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": invalid date '" + fmt.formatCellValue(dateCell) + "'");
                    continue;
                }

                String name = fmt.formatCellValue(nameCell).trim();
                if (name.isBlank()) {
                    errors.add("Row " + (row.getRowNum() + 1) + ": name is blank");
                    continue;
                }

                if (repo.existsByHolidayDate(date)) {
                    skipped++;
                    continue;
                }

                repo.save(PublicHoliday.builder()
                        .id(UUID.randomUUID())
                        .holidayDate(date)
                        .name(name)
                        .createdAt(Instant.now())
                        .build());
                added++;
            }
        }

        return new UploadResult(added, skipped, errors);
    }

    private static boolean isAdmin() {
        Object p = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return p instanceof UserPrincipal up && up.role() == UserRole.ADMIN;
    }

    public record HolidayView(UUID id, LocalDate date, String name) {}
    public record AddHolidayRequest(LocalDate date, String name) {}
    public record UploadResult(int added, int skipped, List<String> errors) {}
}
