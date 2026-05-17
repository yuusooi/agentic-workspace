package com.ai.taskboard.dto.automation;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AutomationRuleVO {
    private Long id;
    private Long projectId;
    private String name;
    private String description;
    private Boolean isActive;
    private String triggerType;
    private List<Map<String, Object>> conditions;
    private List<Map<String, Object>> actions;
    private LocalDateTime createdAt;
    private LocalDateTime lastExecutedAt;
    private Integer executionCount;
}
