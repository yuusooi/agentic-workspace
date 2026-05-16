package com.ai.taskboard.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProjectCreateRequest {
    @NotBlank(message = "项目名称不能为空")
    @Size(max = 100, message = "项目名称最长100字符")
    private String name;

    private String description;

    private String visibility = "PRIVATE";
}
