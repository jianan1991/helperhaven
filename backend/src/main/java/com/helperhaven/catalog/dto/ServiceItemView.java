package com.helperhaven.catalog.dto;

import com.helperhaven.domain.ServiceItem;

import java.util.UUID;

public record ServiceItemView(
        UUID id,
        String icon,
        String title,
        String description,
        int priceSgd,
        int sortOrder,
        boolean active,
        String workflowStage
) {
    public static ServiceItemView from(ServiceItem s) {
        return new ServiceItemView(s.getId(), s.getIcon(), s.getTitle(), s.getDescription(),
                s.getPriceSgd(), s.getSortOrder(), s.isActive(), s.getWorkflowStage());
    }
}
