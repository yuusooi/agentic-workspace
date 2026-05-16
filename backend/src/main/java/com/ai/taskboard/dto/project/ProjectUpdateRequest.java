package com.ai.taskboard.dto.project;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProjectUpdateRequest {
    @Size(max = 100, message = "项目名称最长100字符")
    private String name;

    private String description;

    private String visibility;
}
