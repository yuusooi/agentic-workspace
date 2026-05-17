package com.ai.taskboard.dto.automation;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AutomationRuleUpdateRequest {
    private String name;
    private String description;
    private String triggerType;
    private Map<String, Object> triggerConfig;
    private List<Map<String, Object>> conditions;
    private List<Map<String, Object>> actions;
    private Boolean enabled;
}
