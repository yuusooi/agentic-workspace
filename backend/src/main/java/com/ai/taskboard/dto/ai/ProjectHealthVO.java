package com.ai.taskboard.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

import java.util.List;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ProjectHealthVO {
    private Double score;
    private List<HealthDimension> dimensions;
    private List<HealthRisk> risks;
    private List<HealthSuggestion> suggestions;

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class HealthDimension {
        private String name;
        private Double score;
        private String label;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class HealthRisk {
        private String id;
        private String title;
        private String severity;
        private String description;
    }

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class HealthSuggestion {
        private String id;
        private String title;
        private String description;
    }
}
