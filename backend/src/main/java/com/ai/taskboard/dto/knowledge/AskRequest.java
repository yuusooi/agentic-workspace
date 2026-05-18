package com.ai.taskboard.dto.knowledge;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class AskRequest {
    @NotBlank
    private String question;
    private List<Message> history;

    @Data
    public static class Message {
        private String role;
        private String content;
    }
}
