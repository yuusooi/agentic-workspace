package com.ai.taskboard.dto.knowledge;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class KnowledgeBaseVO {
    private Long id;
    private Long projectId;
    private String name;
    private String description;
    private Integer documentCount;
    private Integer chunkCount;
    private LocalDateTime createdAt;
}
