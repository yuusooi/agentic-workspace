package com.ai.taskboard.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TaskCreateRequest {
    @NotNull(message = "项目ID不能为空")
    private Long projectId;

    @NotNull(message = "列ID不能为空")
    private Long columnId;

    @NotBlank(message = "任务标题不能为空")
    @Size(max = 200, message = "任务标题最长200字符")
    private String title;

    private String description;

    private String priority = "MEDIUM";

    private LocalDate dueDate;

    private List<Long> assigneeIds;

    private List<Long> tagIds;
}
