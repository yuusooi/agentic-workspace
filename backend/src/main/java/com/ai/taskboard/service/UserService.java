package com.ai.taskboard.service;

import com.ai.taskboard.dto.user.PreferenceUpdateRequest;
import com.ai.taskboard.dto.user.UserUpdateRequest;
import com.ai.taskboard.dto.user.UserVO;
import com.ai.taskboard.entity.UserPreference;
import org.springframework.web.multipart.MultipartFile;

public interface UserService {
    UserVO getCurrentUser(Long userId);
    UserVO updateCurrentUser(Long userId, UserUpdateRequest request);
    String uploadAvatar(Long userId, MultipartFile file);
    UserPreference getPreference(Long userId);
    UserPreference updatePreference(Long userId, PreferenceUpdateRequest request);
}
