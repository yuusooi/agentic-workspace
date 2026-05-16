package com.ai.taskboard.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StatusUpdateRequest {
    @NotNull(message = "列ID不能为空")
    private Long columnId;

    @NotBlank(message = "状态不能为空")
    private String status;
}
