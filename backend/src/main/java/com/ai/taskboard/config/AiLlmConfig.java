package com.ai.taskboard.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Data
@Configuration
@ConfigurationProperties(prefix = "ai")
public class AiLlmConfig {

    private LlmConfig llm = new LlmConfig();
    private SseConfig sse = new SseConfig();
    private ConfirmationConfig confirmation = new ConfirmationConfig();

    @Data
    public static class LlmConfig {
        private String baseUrl = "https://api.moonshot.cn/v1";
        private String apiKey;
        private String model = "moonshot-v1-auto";
        private Integer maxTokens = 4096;
        private Double temperature = 0.7;
    }

    @Data
    public static class SseConfig {
        private Long timeout = 300000L;
        private Integer maxConcurrentPerUser = 3;
        private Integer maxConcurrentPerProject = 10;
        private Integer maxConcurrentGlobal = 100;
    }

    @Data
    public static class ConfirmationConfig {
        private Integer ttlMinutes = 30;
    }

    @Bean
    public WebClient aiWebClient() {
        return WebClient.builder()
                .baseUrl(this.llm.getBaseUrl())
                .defaultHeader("Authorization", "Bearer " + this.llm.getApiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
