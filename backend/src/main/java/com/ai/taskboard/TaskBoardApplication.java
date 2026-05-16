package com.ai.taskboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@EnableCaching
@SpringBootApplication
public class TaskBoardApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskBoardApplication.class, args);
    }
}
