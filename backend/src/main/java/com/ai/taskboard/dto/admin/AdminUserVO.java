package com.ai.taskboard.dto.admin;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserVO {
    private Long id;
    private String username;
    private String email;
    private String nickname;
    private String avatar;
    private String role;
    private Integer status;
    private Integer canCreateProject;
    private Integer loginFailCount;
    private LocalDateTime lockTime;
    private LocalDateTime createdAt;
}
