package com.ai.taskboard.dto.user;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @Size(max = 50, message = "昵称最长50字符")
    private String nickname;

    private String oldPassword;
    private String newPassword;
}
