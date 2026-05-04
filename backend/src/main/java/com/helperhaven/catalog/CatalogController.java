package com.helperhaven.catalog;

import com.helperhaven.auth.JwtAuthFilter;
import com.helperhaven.catalog.dto.ServiceItemView;
import com.helperhaven.catalog.dto.ServicePriceRequest;
import com.helperhaven.catalog.dto.ServiceWorkflowStageRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
public class CatalogController {

    private final CatalogService service;

    public CatalogController(CatalogService service) {
        this.service = service;
    }

    /**
     * Returns active services for employers.
     * Pass ?all=true (admin only) to include inactive services.
     */
    @GetMapping
    public List<ServiceItemView> list(@RequestParam(defaultValue = "false") boolean all) {
        if (all) {
            return service.listAll(JwtAuthFilter.currentUserId());
        }
        return service.listActive();
    }

    /** Admin: update the price of a service. */
    @PutMapping("/{id}/price")
    public ServiceItemView updatePrice(
            @PathVariable UUID id,
            @Valid @RequestBody ServicePriceRequest req
    ) {
        return service.updatePrice(id, req.priceSgd(), JwtAuthFilter.currentUserId());
    }

    /** Admin: assign or clear the workflow stage for a service. */
    @PutMapping("/{id}/workflow-stage")
    public ServiceItemView updateWorkflowStage(
            @PathVariable UUID id,
            @RequestBody ServiceWorkflowStageRequest req
    ) {
        return service.updateWorkflowStage(id, req.workflowStage(), JwtAuthFilter.currentUserId());
    }
}
