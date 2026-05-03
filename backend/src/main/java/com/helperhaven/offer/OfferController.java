package com.helperhaven.offer;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.offer.dto.OfferRequest;
import com.helperhaven.offer.dto.OfferView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class OfferController {

    private final OfferService service;

    public OfferController(OfferService service) {
        this.service = service;
    }

    @GetMapping("/api/chats/{conversationId}/offers")
    public List<OfferView> list(@PathVariable UUID conversationId) {
        return service.list(JwtAuthFilter.currentUserId(), conversationId);
    }

    @PostMapping("/api/chats/{conversationId}/offers")
    @ResponseStatus(HttpStatus.CREATED)
    public OfferView create(
            @PathVariable UUID conversationId,
            @Valid @RequestBody OfferRequest req
    ) {
        return service.create(JwtAuthFilter.currentUserId(), conversationId,
                req.salarySgd(), req.offDayPolicy());
    }

    @PostMapping("/api/offers/{offerId}/accept")
    public OfferView accept(@PathVariable UUID offerId) {
        return service.accept(JwtAuthFilter.currentUserId(), offerId);
    }

    @PostMapping("/api/offers/{offerId}/reject")
    public OfferView reject(@PathVariable UUID offerId) {
        return service.reject(JwtAuthFilter.currentUserId(), offerId);
    }

    @PostMapping("/api/offers/{offerId}/counter")
    @ResponseStatus(HttpStatus.CREATED)
    public OfferView counter(
            @PathVariable UUID offerId,
            @Valid @RequestBody OfferRequest req
    ) {
        return service.counter(JwtAuthFilter.currentUserId(), offerId,
                req.salarySgd(), req.offDayPolicy());
    }
}
