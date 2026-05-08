package com.helperhaven.placement;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.placement.dto.CreatePlacementRequest;
import com.helperhaven.placement.dto.PlacementView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/placements")
public class PlacementController {

    private final PlacementService service;

    public PlacementController(PlacementService service) {
        this.service = service;
    }

    @GetMapping
    public List<PlacementView> list() {
        return service.listForUser(JwtAuthFilter.currentUserId());
    }

    /** Create a placement from an accepted offer. Body: { mode, selectedServiceIds } */
    @PostMapping("/from-offer/{offerId}")
    @ResponseStatus(HttpStatus.CREATED)
    public PlacementView create(
            @PathVariable UUID offerId,
            @Valid @RequestBody CreatePlacementRequest req
    ) {
        return service.create(JwtAuthFilter.currentUserId(), offerId, req);
    }

    @PutMapping("/{placementId}/member-count")
    public PlacementView setMemberDocCount(
            @PathVariable UUID placementId,
            @RequestBody MemberCountRequest req
    ) {
        return service.setMemberDocCount(JwtAuthFilter.currentUserId(), placementId, req.memberDocCount());
    }

    public record MemberCountRequest(int memberDocCount) {}

    @PutMapping("/{placementId}/ideal-start-date")
    public PlacementView setIdealStartDate(
            @PathVariable UUID placementId,
            @RequestBody IdealStartDateRequest req
    ) {
        return service.setIdealStartDate(JwtAuthFilter.currentUserId(), placementId, req.idealStartDate());
    }

    public record IdealStartDateRequest(LocalDate idealStartDate) {}

    @RestControllerAdvice(assignableTypes = PlacementController.class)
    static class Handler {
        @ExceptionHandler(PlacementService.PlacementException.class)
        public ResponseEntity<Map<String, String>> handle(PlacementService.PlacementException ex) {
            HttpStatus status = switch (ex.error()) {
                case NOT_FOUND -> HttpStatus.NOT_FOUND;
                case FORBIDDEN -> HttpStatus.FORBIDDEN;
                default -> HttpStatus.BAD_REQUEST;
            };
            return ResponseEntity.status(status)
                    .body(Map.of("error", ex.error().name(), "message", ex.getMessage()));
        }
    }
}
