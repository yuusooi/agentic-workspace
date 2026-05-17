package com.ai.taskboard.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AiChatSessionDetailVO {
    private Long id;
    private Long userId;
    private Long projectId;
    private String title;
    private LocalDateTime createdAt;
    private Integer messageCount;
    private List<AiChatMessageVO> messages;
}
