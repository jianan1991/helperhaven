package com.helperhaven.domain.enums;

/**
 * Original V1 review context. Sprint A only writes {@code PLACEMENT}; we keep
 * {@code MEETING} for backwards compatibility with the V1 video-meeting model
 * even though that subsystem is gone post-V3.
 */
public enum ReviewContext {
    MEETING,
    PLACEMENT
}
