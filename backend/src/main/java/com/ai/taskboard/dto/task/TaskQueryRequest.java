package com.ai.taskboard.dto.task;

import lombok.Data;

@Data
public class TaskQueryRequest {
    private Long projectId;
    private Long columnId;
    private String status;
    private String priority;
    private String keyword;
    private Long assigneeId;
    private Integer page = 1;
    private Integer size = 20;
}
