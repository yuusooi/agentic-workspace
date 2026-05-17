package com.ai.taskboard.dto.ai;

import lombok.Data;

@Data
public class AIChatRequest {
    private String prompt;
    private Long projectId;
}
