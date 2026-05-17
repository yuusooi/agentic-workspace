package com.ai.taskboard.dto.task;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskUpdateRequest {
    private String title;
    private String description;
    private String priority;
    private String status;
    private Long columnId;
    private Integer sortOrder;
    private LocalDate dueDate;
    private java.math.BigDecimal estimatedHours;
    private java.math.BigDecimal actualHours;
    private Integer version;
}
