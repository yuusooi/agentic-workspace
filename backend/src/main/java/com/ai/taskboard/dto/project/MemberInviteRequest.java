package com.ai.taskboard.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MemberInviteRequest {
    @NotBlank(message = "账号不能为空")
    @Size(min = 3, max = 20, message = "账号长度3-20位")
    private String username;

    private String role = "MEMBER";
}
