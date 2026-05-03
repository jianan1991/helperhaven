package com.helperhaven.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlacementServiceItemKey implements Serializable {

    @Column(name = "placement_id")
    private UUID placementId;

    @Column(name = "service_id")
    private UUID serviceId;
}
