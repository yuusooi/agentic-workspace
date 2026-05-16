package com.ai.taskboard.dto.project;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProjectVO {
    private Long id;
    private String name;
    private String description;
    private String visibility;
    private Long ownerId;
    private String ownerName;
    private String myRole;
    private LocalDateTime createdAt;
}
