package com.ai.taskboard.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI智能任务协同看板 API")
                        .description("AI-Driven Intelligent Task Collaboration Board API Documentation")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("TaskBoard Team")));
    }
}
