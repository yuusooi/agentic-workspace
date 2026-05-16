package com.ai.taskboard.dto.task;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskUpdateRequest {
    private String title;
    private String description;
    private String priority;
    private Long columnId;
    private Integer sortOrder;
    private LocalDate dueDate;
}
