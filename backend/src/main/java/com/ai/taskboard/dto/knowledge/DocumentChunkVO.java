package com.ai.taskboard.dto.knowledge;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class DocumentChunkVO {
    private Long id;
    private Long documentId;
    private String content;
    private Integer chunkIndex;
}
