package com.ai.taskboard.dto.automation;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AutomationRuleCreateRequest {
    @NotBlank
    private String name;
    private String description;
    @NotBlank
    private String triggerType;
    private Map<String, Object> triggerConfig;
    private List<Map<String, Object>> conditions;
    @NotNull
    private List<Map<String, Object>> actions;
}
