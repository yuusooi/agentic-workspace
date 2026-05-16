package com.ai.taskboard.service;

import com.ai.taskboard.dto.auth.*;
import com.ai.taskboard.dto.auth.LoginResponse.UserInfo;

public interface AuthService {
    void sendVerifyCode(SendCodeRequest request);
    void register(RegisterRequest request);
    LoginResponse login(LoginRequest request);
    LoginResponse refresh(RefreshRequest request);
    void logout(Long userId);
    void resetPassword(ResetPasswordRequest request);
    UserInfo getUserInfo(Long userId);
}
