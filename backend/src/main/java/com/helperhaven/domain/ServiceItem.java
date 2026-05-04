package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceItem {

    @Id
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(nullable = false, length = 20)
    private String icon;

    @Column(name = "price_sgd", nullable = false)
    private int priceSgd;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active;

    /** INITIATED | DOCS_COLLECTION | MOM_SUBMITTED | IPA_ISSUED | HELPER_ARRIVAL | ACTIVE — or null if not stage-specific */
    @Column(name = "workflow_stage", length = 30)
    private String workflowStage;
}
