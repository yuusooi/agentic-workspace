package com.ai.taskboard.service.impl;

import cn.hutool.core.io.FileUtil;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.dto.user.PreferenceUpdateRequest;
import com.ai.taskboard.dto.user.UserUpdateRequest;
import com.ai.taskboard.dto.user.UserVO;
import com.ai.taskboard.entity.User;
import com.ai.taskboard.entity.UserPreference;
import com.ai.taskboard.mapper.UserMapper;
import com.ai.taskboard.mapper.UserPreferenceMapper;
import com.ai.taskboard.service.UserService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final UserPreferenceMapper userPreferenceMapper;
    private final PasswordEncoder passwordEncoder;

    @Value("${file.upload-path:./uploads}")
    private String uploadPath;

    @Override
    public UserVO getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return UserVO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .canCreateProject(user.getCanCreateProject())
                .build();
    }

    @Override
    public UserVO updateCurrentUser(Long userId, UserUpdateRequest request) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }

        if (request.getOldPassword() != null && request.getNewPassword() != null) {
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
                throw new BusinessException("原密码错误");
            }
            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        }

        userMapper.updateById(user);
        return getCurrentUser(userId);
    }

    @Override
    public String uploadAvatar(Long userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BusinessException("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : ".png";
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;

        String avatarDir = uploadPath + "/avatars";
        FileUtil.mkdir(avatarDir);
        File dest = new File(avatarDir, fileName);

        try {
            file.transferTo(dest);
        } catch (IOException e) {
            throw new BusinessException("文件上传失败");
        }

        String avatarUrl = "/uploads/avatars/" + fileName;
        User user = userMapper.selectById(userId);
        user.setAvatar(avatarUrl);
        userMapper.updateById(user);

        return avatarUrl;
    }

    @Override
    public UserPreference getPreference(Long userId) {
        UserPreference preference = userPreferenceMapper.selectOne(
                new LambdaQueryWrapper<UserPreference>().eq(UserPreference::getUserId, userId));
        if (preference == null) {
            preference = new UserPreference();
            preference.setUserId(userId);
            preference.setEmailNotification(1);
            preference.setDeadlineReminder(1);
            preference.setOverdueWarning(1);
            preference.setStatusChangeNotify(1);
            preference.setMentionNotify(1);
            preference.setMemberChangeNotify(1);
            userPreferenceMapper.insert(preference);
        }
        return preference;
    }

    @Override
    public UserPreference updatePreference(Long userId, PreferenceUpdateRequest request) {
        UserPreference preference = getPreference(userId);

        if (request.getEmailNotification() != null) {
            preference.setEmailNotification(request.getEmailNotification());
        }
        if (request.getDeadlineReminder() != null) {
            preference.setDeadlineReminder(request.getDeadlineReminder());
        }
        if (request.getOverdueWarning() != null) {
            preference.setOverdueWarning(request.getOverdueWarning());
        }
        if (request.getStatusChangeNotify() != null) {
            preference.setStatusChangeNotify(request.getStatusChangeNotify());
        }
        if (request.getMentionNotify() != null) {
            preference.setMentionNotify(request.getMentionNotify());
        }
        if (request.getMemberChangeNotify() != null) {
            preference.setMemberChangeNotify(request.getMemberChangeNotify());
        }

        userPreferenceMapper.updateById(preference);
        return preference;
    }
}
