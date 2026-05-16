package com.ai.taskboard.dto.column;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ColumnCreateRequest {
    @NotBlank(message = "列名称不能为空")
    @Size(max = 50, message = "列名称最长50字符")
    private String name;

    private String statusMapping = "TODO";
}
