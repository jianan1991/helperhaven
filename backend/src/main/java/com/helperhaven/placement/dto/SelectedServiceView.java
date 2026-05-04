package com.helperhaven.placement.dto;

import java.util.UUID;

public record SelectedServiceView(UUID id, String icon, String title, int priceSgd, String workflowStage) {}
