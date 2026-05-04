package com.helperhaven.employment;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.auth.UserPrincipal;
import com.helperhaven.domain.*;
import com.helperhaven.domain.enums.UserRole;
import com.helperhaven.repo.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/employment/{placementId}")
public class EmploymentController {

    private final PlacementRepository placements;
    private final LeaveRequestRepository leaveRequests;
    private final TodoRepository todos;
    private final TodoTemplateRepository todoTemplates;
    private final TerminationRequestRepository terminationRequests;
    private final PublicHolidayRepository publicHolidays;
    private final HelperProfileRepository helpers;
    private final EmployerProfileRepository employers;

    public EmploymentController(
            PlacementRepository placements,
            LeaveRequestRepository leaveRequests,
            TodoRepository todos,
            TodoTemplateRepository todoTemplates,
            TerminationRequestRepository terminationRequests,
            PublicHolidayRepository publicHolidays,
            HelperProfileRepository helpers,
            EmployerProfileRepository employers
    ) {
        this.placements = placements;
        this.leaveRequests = leaveRequests;
        this.todos = todos;
        this.todoTemplates = todoTemplates;
        this.terminationRequests = terminationRequests;
        this.publicHolidays = publicHolidays;
        this.helpers = helpers;
        this.employers = employers;
    }

    // ── Overview ─────────────────────────────────────────────────────────────

    @GetMapping
    public EmploymentView overview(@PathVariable UUID placementId, HttpServletResponse res) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        return toView(p);
    }

    @PutMapping("/start-date")
    @Transactional
    public EmploymentView setStartDate(
            @PathVariable UUID placementId,
            @RequestBody StartDateRequest req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may set start date"); return null; }
        if (!"ACTIVE".equals(p.getStatus())) { res.sendError(400, "Employment is not active"); return null; }
        p.setEmploymentStartDate(req.startDate());
        p.setEmploymentEndDate(req.startDate().plusYears(2));
        p.setUpdatedAt(Instant.now());
        placements.save(p);
        return toView(p);
    }

    @PutMapping("/end-date")
    @Transactional
    public EmploymentView setEndDate(
            @PathVariable UUID placementId,
            @RequestBody EndDateRequest req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may set end date"); return null; }
        if (!"ACTIVE".equals(p.getStatus())) { res.sendError(400, "Employment is not active"); return null; }
        p.setEmploymentEndDate(req.endDate());
        p.setUpdatedAt(Instant.now());
        placements.save(p);
        return toView(p);
    }

    @PutMapping("/rest-day")
    @Transactional
    public EmploymentView setRestDay(
            @PathVariable UUID placementId,
            @RequestBody RestDayRequest req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may set rest day"); return null; }
        if (req.restDayOfWeek() < 0 || req.restDayOfWeek() > 6) { res.sendError(400, "restDayOfWeek must be 0–6"); return null; }
        p.setRestDayOfWeek(req.restDayOfWeek());
        p.setUpdatedAt(Instant.now());
        placements.save(p);
        return toView(p);
    }

    // ── Leave Requests ────────────────────────────────────────────────────────

    @GetMapping("/leave-requests")
    public List<LeaveRequestView> listLeave(@PathVariable UUID placementId, HttpServletResponse res) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        return leaveRequests.findByPlacementIdOrderByStartDateAsc(placementId)
                .stream().map(lr -> toLeaveView(lr, p)).toList();
    }

    @PostMapping("/leave-requests")
    @Transactional
    public LeaveRequestView createLeave(
            @PathVariable UUID placementId,
            @RequestBody LeaveRequestBody req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!"ACTIVE".equals(p.getStatus())) { res.sendError(400, "Employment is not active"); return null; }

        String type = req.type().toUpperCase();
        boolean isHelper = callerId.equals(p.getHelperId());
        boolean isEmployer = callerId.equals(p.getEmployerId());

        if ("FAMILY_AWAY".equals(type) && !isEmployer) {
            res.sendError(403, "Only employer may mark family away"); return null;
        }
        if (!"FAMILY_AWAY".equals(type) && !isHelper) {
            res.sendError(403, "Only helper may request leave"); return null;
        }
        if (!List.of("ANNUAL", "MEDICAL", "FAMILY_AWAY").contains(type)) {
            res.sendError(400, "Invalid leave type"); return null;
        }

        // FAMILY_AWAY is auto-approved; helper leave starts PENDING
        String status = "FAMILY_AWAY".equals(type) ? "APPROVED" : "PENDING";
        Instant now = Instant.now();
        LeaveRequest lr = LeaveRequest.builder()
                .id(UUID.randomUUID())
                .placementId(placementId)
                .requesterUserId(callerId)
                .type(type)
                .startDate(req.startDate())
                .endDate(req.endDate())
                .note(req.note())
                .status(status)
                .respondedAt("APPROVED".equals(status) ? now : null)
                .createdAt(now)
                .build();
        leaveRequests.save(lr);
        return toLeaveView(lr, p);
    }

    @PutMapping("/leave-requests/{leaveId}")
    @Transactional
    public LeaveRequestView respondLeave(
            @PathVariable UUID placementId,
            @PathVariable UUID leaveId,
            @RequestBody RespondLeaveRequest req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may respond to leave requests"); return null; }

        LeaveRequest lr = leaveRequests.findById(leaveId).orElse(null);
        if (lr == null || !lr.getPlacementId().equals(placementId)) { res.sendError(404); return null; }
        if (!"PENDING".equals(lr.getStatus())) { res.sendError(400, "Leave request already responded"); return null; }

        String newStatus = req.approved() ? "APPROVED" : "DENIED";
        lr.setStatus(newStatus);
        lr.setRespondedAt(Instant.now());
        leaveRequests.save(lr);
        return toLeaveView(lr, p);
    }

    // ── Todo Templates ────────────────────────────────────────────────────────

    @GetMapping("/todo-templates")
    public List<TodoTemplateView> listTemplates(@PathVariable UUID placementId, HttpServletResponse res) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        return todoTemplates.findByPlacementIdOrderBySortOrderAscCreatedAtAsc(placementId)
                .stream().map(this::toTemplateView).toList();
    }

    @PostMapping("/todo-templates")
    @Transactional
    public TodoTemplateView addTemplate(
            @PathVariable UUID placementId,
            @RequestBody TodoTemplateBody req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may manage routine tasks"); return null; }

        String recType = req.recurrenceType() != null
                ? req.recurrenceType().toUpperCase()
                : "DAILY";
        if (!List.of("DAILY", "WEEKDAYS", "WEEKENDS", "WEEKLY").contains(recType)) {
            res.sendError(400, "Invalid recurrenceType"); return null;
        }
        if ("WEEKLY".equals(recType) && (req.daysOfWeek() == null || req.daysOfWeek() == 0)) {
            res.sendError(400, "daysOfWeek must be set for WEEKLY recurrence"); return null;
        }

        int nextOrder = todoTemplates.countByPlacementId(placementId);
        TodoTemplate tmpl = TodoTemplate.builder()
                .id(UUID.randomUUID())
                .placementId(placementId)
                .description(req.description())
                .sortOrder(req.sortOrder() != null ? req.sortOrder() : nextOrder)
                .recurrenceType(recType)
                .daysOfWeek("WEEKLY".equals(recType) ? req.daysOfWeek() : null)
                .createdAt(Instant.now())
                .build();
        todoTemplates.save(tmpl);
        return toTemplateView(tmpl);
    }

    @DeleteMapping("/todo-templates/{templateId}")
    @Transactional
    public void deleteTemplate(
            @PathVariable UUID placementId,
            @PathVariable UUID templateId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may manage routine tasks"); return; }

        TodoTemplate tmpl = todoTemplates.findById(templateId).orElse(null);
        if (tmpl == null || !tmpl.getPlacementId().equals(placementId)) { res.sendError(404); return; }
        todoTemplates.delete(tmpl);
    }

    // ── Todos ─────────────────────────────────────────────────────────────────

    @GetMapping("/todos")
    @Transactional
    public List<TodoView> listTodos(
            @PathVariable UUID placementId,
            @RequestParam(required = false) String date,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;

        if (date != null) {
            LocalDate d = LocalDate.parse(date);
            // 0=Mon … 6=Sun (same convention as our bitmask)
            int dowIndex = d.getDayOfWeek().getValue() - 1;
            // Auto-materialize recurring templates that apply to this day
            List<TodoTemplate> templates = todoTemplates.findByPlacementIdOrderBySortOrderAscCreatedAtAsc(placementId);
            Instant now = Instant.now();
            for (TodoTemplate tmpl : templates) {
                if (!appliesToDay(tmpl, dowIndex)) continue;
                if (!todos.existsByPlacementIdAndTemplateIdAndDueDate(placementId, tmpl.getId(), d)) {
                    todos.save(Todo.builder()
                            .id(UUID.randomUUID())
                            .placementId(placementId)
                            .createdByUserId(p.getEmployerId())
                            .description(tmpl.getDescription())
                            .templateId(tmpl.getId())
                            .sortOrder(tmpl.getSortOrder())
                            .recurrenceType(tmpl.getRecurrenceType())
                            .dueDate(d)
                            .createdAt(now)
                            .build());
                }
            }
            List<Todo> recurring = todos.findByPlacementIdAndDueDateAndTemplateIdIsNotNullOrderBySortOrderAscCreatedAtAsc(placementId, d);
            List<Todo> adhoc = todos.findByPlacementIdAndDueDateAndTemplateIdIsNullOrderByCreatedAtAsc(placementId, d);
            List<TodoView> result = new ArrayList<>();
            recurring.forEach(t -> result.add(toTodoView(t)));
            adhoc.forEach(t -> result.add(toTodoView(t)));
            return result;
        } else {
            return todos.findByPlacementIdOrderByDueDateDescCreatedAtAsc(placementId)
                    .stream().map(this::toTodoView).toList();
        }
    }

    @PostMapping("/todos")
    @Transactional
    public TodoView createTodo(
            @PathVariable UUID placementId,
            @RequestBody TodoBody req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may add todos"); return null; }
        if (!"ACTIVE".equals(p.getStatus())) { res.sendError(400, "Employment is not active"); return null; }

        LocalDate dueDate = req.dueDate() != null ? req.dueDate() : LocalDate.now();
        Todo t = Todo.builder()
                .id(UUID.randomUUID())
                .placementId(placementId)
                .createdByUserId(callerId)
                .description(req.description())
                .dueDate(dueDate)
                .createdAt(Instant.now())
                .build();
        todos.save(t);
        return toTodoView(t);
    }

    @PostMapping("/todos/{todoId}/complete")
    @Transactional
    public TodoView completeTodo(
            @PathVariable UUID placementId,
            @PathVariable UUID todoId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getHelperId())) { res.sendError(403, "Only helper may complete todos"); return null; }

        Todo t = todos.findById(todoId).orElse(null);
        if (t == null || !t.getPlacementId().equals(placementId)) { res.sendError(404); return null; }
        t.setCompletedAt(t.getCompletedAt() == null ? Instant.now() : null);
        todos.save(t);
        return toTodoView(t);
    }

    @DeleteMapping("/todos/{todoId}")
    @Transactional
    public void deleteTodo(
            @PathVariable UUID placementId,
            @PathVariable UUID todoId,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may delete todos"); return; }

        Todo t = todos.findById(todoId).orElse(null);
        if (t == null || !t.getPlacementId().equals(placementId)) { res.sendError(404); return; }
        todos.delete(t);
    }

    // ── Public Holidays ───────────────────────────────────────────────────────

    @GetMapping("/holidays")
    public List<HolidayView> listHolidays(
            @PathVariable UUID placementId,
            @RequestParam String from,
            @RequestParam String to,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        return publicHolidays.findByHolidayDateBetweenOrderByHolidayDateAsc(
                LocalDate.parse(from), LocalDate.parse(to)
        ).stream().map(h -> new HolidayView(h.getId(), h.getHolidayDate(), h.getName())).toList();
    }

    // ── Termination ───────────────────────────────────────────────────────────

    @PostMapping("/terminate")
    @Transactional
    public TerminationRequestView requestTermination(
            @PathVariable UUID placementId,
            @RequestBody TerminateBody req,
            HttpServletResponse res
    ) throws IOException {
        UUID callerId = JwtAuthFilter.currentUserId();
        Placement p = requireParty(callerId, placementId, res);
        if (p == null) return null;
        if (!callerId.equals(p.getEmployerId())) { res.sendError(403, "Only employer may request termination"); return null; }
        if (!"ACTIVE".equals(p.getStatus())) { res.sendError(400, "Employment is not active"); return null; }

        if (terminationRequests.findByPlacementIdAndStatus(placementId, "PENDING").isPresent()) {
            res.sendError(409, "A termination request is already pending for this placement");
            return null;
        }

        Instant now = Instant.now();
        TerminationRequest tr = TerminationRequest.builder()
                .id(UUID.randomUUID())
                .placementId(placementId)
                .requestedByUserId(callerId)
                .reason(req.reason())
                .status("PENDING")
                .createdAt(now)
                .build();
        terminationRequests.save(tr);

        if (!"JWC".equals(p.getEngagementMode())) {
            p.setStatus("TERMINATED");
            p.setUpdatedAt(now);
            placements.save(p);
            tr.setStatus("RESOLVED");
            tr.setResolvedAt(now);
            terminationRequests.save(tr);
        }

        return toTerminationView(tr, p);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Placement requireParty(UUID callerId, UUID placementId, HttpServletResponse res) throws IOException {
        Placement p = placements.findById(placementId).orElse(null);
        if (p == null) { res.sendError(404); return null; }
        boolean isAdmin = isAdmin();
        boolean isParty = callerId.equals(p.getEmployerId()) || callerId.equals(p.getHelperId());
        if (!isAdmin && !isParty) { res.sendError(403); return null; }
        return p;
    }

    private EmploymentView toView(Placement p) {
        var hp = helpers.findById(p.getHelperId()).orElse(null);
        var ep = employers.findById(p.getEmployerId()).orElse(null);
        String helperName = hp != null && hp.getDisplayFirstName() != null ? hp.getDisplayFirstName() : "Helper";
        String employerName = ep != null && ep.getFullName() != null ? ep.getFullName() : "Family";
        return new EmploymentView(
                p.getId(), p.getStatus(), p.getEngagementMode(),
                p.getEmploymentStartDate(), p.getEmploymentEndDate(), p.getRestDayOfWeek(),
                helperName, employerName,
                p.getEmployerId(), p.getHelperId()
        );
    }

    private LeaveRequestView toLeaveView(LeaveRequest lr, Placement p) {
        String requesterRole = lr.getRequesterUserId().equals(p.getEmployerId()) ? "EMPLOYER" : "HELPER";
        return new LeaveRequestView(
                lr.getId(), lr.getRequesterUserId(), requesterRole,
                lr.getType(), lr.getStartDate(), lr.getEndDate(),
                lr.getNote(), lr.getStatus(), lr.getRespondedAt(), lr.getCreatedAt()
        );
    }

    private TodoView toTodoView(Todo t) {
        return new TodoView(t.getId(), t.getDescription(), t.getDueDate(),
                t.getCompletedAt() != null, t.getTemplateId() != null, t.getRecurrenceType(), t.getCreatedAt());
    }

    private TodoTemplateView toTemplateView(TodoTemplate t) {
        return new TodoTemplateView(t.getId(), t.getDescription(), t.getSortOrder(), t.getRecurrenceType(), t.getDaysOfWeek());
    }

    private static boolean appliesToDay(TodoTemplate tmpl, int dowIndex) {
        return switch (tmpl.getRecurrenceType()) {
            case "DAILY"    -> true;
            case "WEEKDAYS" -> dowIndex <= 4;
            case "WEEKENDS" -> dowIndex >= 5;
            case "WEEKLY"   -> tmpl.getDaysOfWeek() != null && ((tmpl.getDaysOfWeek() >> dowIndex) & 1) == 1;
            default         -> false;
        };
    }

    private TerminationRequestView toTerminationView(TerminationRequest tr, Placement p) {
        return new TerminationRequestView(
                tr.getId(), tr.getPlacementId(), tr.getReason(), tr.getStatus(),
                tr.getAdminNotes(), tr.getCreatedAt(), tr.getResolvedAt()
        );
    }

    private static boolean isAdmin() {
        Object pr = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return pr instanceof UserPrincipal up && up.role() == UserRole.ADMIN;
    }

    // ── Request / Response records ────────────────────────────────────────────

    public record EmploymentView(
            UUID placementId, String status, String engagementMode,
            LocalDate employmentStartDate, LocalDate employmentEndDate, Integer restDayOfWeek,
            String helperDisplayName, String employerDisplayName,
            UUID employerId, UUID helperId
    ) {}

    public record LeaveRequestView(
            UUID id, UUID requesterUserId, String requesterRole,
            String type, LocalDate startDate, LocalDate endDate,
            String note, String status, Instant respondedAt, Instant createdAt
    ) {}

    public record TodoView(UUID id, String description, LocalDate dueDate, boolean completed, boolean recurring, String recurrenceType, Instant createdAt) {}

    public record TodoTemplateView(UUID id, String description, int sortOrder, String recurrenceType, Integer daysOfWeek) {}

    public record HolidayView(UUID id, LocalDate date, String name) {}

    public record TerminationRequestView(
            UUID id, UUID placementId, String reason, String status,
            String adminNotes, Instant createdAt, Instant resolvedAt
    ) {}

    public record StartDateRequest(LocalDate startDate) {}
    public record EndDateRequest(LocalDate endDate) {}
    public record RestDayRequest(int restDayOfWeek) {}
    public record LeaveRequestBody(String type, LocalDate startDate, LocalDate endDate, String note) {}
    public record RespondLeaveRequest(boolean approved) {}
    public record TodoBody(String description, LocalDate dueDate) {}
    public record TodoTemplateBody(String description, Integer sortOrder, String recurrenceType, Integer daysOfWeek) {}
    public record TerminateBody(String reason) {}
}
