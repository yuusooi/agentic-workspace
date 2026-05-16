package com.ai.taskboard.dto.project;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProjectMemberVO {
    private Long id;
    private Long userId;
    private String email;
    private String nickname;
    private String avatar;
    private String role;
    private LocalDateTime joinedAt;
}
