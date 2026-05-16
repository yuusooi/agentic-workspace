package com.ai.taskboard.dto.admin;

import lombok.Data;

@Data
public class AdminUserUpdateRequest {
    private String role;
    private Integer status;
    private Integer canCreateProject;
}
