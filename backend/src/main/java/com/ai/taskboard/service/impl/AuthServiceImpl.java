package com.ai.taskboard.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.ai.taskboard.common.constant.Constants;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.common.util.JwtUtil;
import com.ai.taskboard.dto.auth.*;
import com.ai.taskboard.dto.auth.LoginResponse.UserInfo;
import com.ai.taskboard.entity.User;
import com.ai.taskboard.entity.UserPreference;
import com.ai.taskboard.mapper.UserMapper;
import com.ai.taskboard.mapper.UserPreferenceMapper;
import com.ai.taskboard.service.AuthService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final UserPreferenceMapper userPreferenceMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Override
    public void sendVerifyCode(SendCodeRequest request) {
        String rateKey = Constants.REDIS_CODE_RATE_PREFIX + request.getEmail();
        if (Boolean.TRUE.equals(redisTemplate.hasKey(rateKey))) {
            throw new BusinessException(ResultCode.CODE_RATE_LIMITED);
        }

        String code = RandomUtil.randomNumbers(6);
        String key = Constants.REDIS_VERIFY_CODE_PREFIX + request.getEmail();
        redisTemplate.opsForValue().set(key, code, 5, TimeUnit.MINUTES);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(request.getEmail());
        message.setSubject("AI任务看板 - 验证码");
        message.setText("您的验证码为：" + code + "，5分钟内有效。");
        try {
            mailSender.send(message);
        } catch (Exception e) {
            throw new BusinessException("邮件发送失败，请稍后重试");
        }

        redisTemplate.opsForValue().set(rateKey, "1", 60, TimeUnit.SECONDS);
    }

    @Override
    public void register(RegisterRequest request) {
        String codeKey = Constants.REDIS_VERIFY_CODE_PREFIX + request.getEmail();
        Object storedCode = redisTemplate.opsForValue().get(codeKey);
        if (storedCode == null || !storedCode.equals(request.getCode())) {
            throw new BusinessException(ResultCode.VERIFY_CODE_ERROR);
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BusinessException("两次输入的密码不一致");
        }

        String password = request.getPassword();
        if (password.length() < 8 || password.length() > 128
                || !password.matches(".*[A-Z].*")
                || !password.matches(".*[a-z].*")
                || !password.matches(".*\\d.*")) {
            throw new BusinessException("密码必须8-128位，包含大小写字母和数字");
        }

        if (!request.getUsername().matches("^[a-zA-Z][a-zA-Z0-9_-]{2,19}$")) {
            throw new BusinessException("用户名必须3-20位，字母开头，仅允许字母、数字、下划线、连字符");
        }

        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail()));
        if (count > 0) {
            throw new BusinessException(ResultCode.EMAIL_EXISTS);
        }

        Long usernameCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.getUsername()));
        if (usernameCount > 0) {
            throw new BusinessException(ResultCode.EMAIL_EXISTS.getCode(), "用户名已存在");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setRole(Constants.ROLE_USER);
        user.setStatus(1);
        user.setCanCreateProject(0);
        user.setLoginFailCount(0);
        userMapper.insert(user);

        UserPreference preference = new UserPreference();
        preference.setUserId(user.getId());
        preference.setEmailNotification(1);
        preference.setDeadlineReminder(1);
        preference.setOverdueWarning(1);
        preference.setStatusChangeNotify(1);
        preference.setMentionNotify(1);
        preference.setMemberChangeNotify(1);
        userPreferenceMapper.insert(preference);

        redisTemplate.delete(codeKey);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail()));
        if (user == null) {
            throw new BusinessException(ResultCode.LOGIN_FAIL);
        }

        if (user.getLockTime() != null && user.getLockTime().plusMinutes(Constants.LOCK_DURATION_MINUTES).isAfter(LocalDateTime.now())) {
            long remainingSeconds = java.time.Duration.between(LocalDateTime.now(),
                    user.getLockTime().plusMinutes(Constants.LOCK_DURATION_MINUTES)).getSeconds();
            throw new BusinessException(ResultCode.ACCOUNT_LOCKED,
                    java.util.Map.of("locked_until", user.getLockTime().plusMinutes(Constants.LOCK_DURATION_MINUTES),
                            "remaining_seconds", remainingSeconds));
        }

        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BusinessException(ResultCode.ACCOUNT_DISABLED);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            user.setLoginFailCount(user.getLoginFailCount() + 1);
            int remainingAttempts = Constants.MAX_LOGIN_FAIL_COUNT - user.getLoginFailCount();
            if (user.getLoginFailCount() >= Constants.MAX_LOGIN_FAIL_COUNT) {
                user.setLockTime(LocalDateTime.now());
                userMapper.updateById(user);
                long remainingSeconds = Constants.LOCK_DURATION_MINUTES * 60;
                throw new BusinessException(ResultCode.ACCOUNT_LOCKED,
                        java.util.Map.of("locked_until", user.getLockTime().plusMinutes(Constants.LOCK_DURATION_MINUTES),
                                "remaining_seconds", remainingSeconds));
            }
            userMapper.updateById(user);
            throw new BusinessException(ResultCode.INVALID_CREDENTIALS,
                    java.util.Map.of("remaining_attempts", remainingAttempts));
        }

        user.setLoginFailCount(0);
        user.setLockTime(null);
        userMapper.updateById(user);

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        redisTemplate.opsForValue().set(Constants.REDIS_ACCESS_TOKEN_PREFIX + user.getId(), accessToken, 15, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(Constants.REDIS_REFRESH_TOKEN_PREFIX + user.getId(), refreshToken, 7, TimeUnit.DAYS);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(900L)
                .userInfo(UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .role(user.getRole())
                        .canCreateProject(user.getCanCreateProject())
                        .build())
                .build();
    }

    @Override
    public LoginResponse refresh(RefreshRequest request) {
        if (!jwtUtil.validateToken(request.getRefreshToken()) || !jwtUtil.isRefreshToken(request.getRefreshToken())) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }

        Long userId = jwtUtil.getUserIdFromToken(request.getRefreshToken());
        String redisKey = Constants.REDIS_REFRESH_TOKEN_PREFIX + userId;
        Object storedToken = redisTemplate.opsForValue().get(redisKey);
        if (storedToken == null || !String.valueOf(storedToken).equals(request.getRefreshToken())) {
            throw new BusinessException(ResultCode.TOKEN_INVALID);
        }

        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED);
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        redisTemplate.opsForValue().set(Constants.REDIS_ACCESS_TOKEN_PREFIX + user.getId(), accessToken, 15, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(Constants.REDIS_REFRESH_TOKEN_PREFIX + user.getId(), refreshToken, 7, TimeUnit.DAYS);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(900L)
                .userInfo(UserInfo.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .nickname(user.getNickname())
                        .avatar(user.getAvatar())
                        .role(user.getRole())
                        .canCreateProject(user.getCanCreateProject())
                        .build())
                .build();
    }

    @Override
    public void logout(Long userId) {
        redisTemplate.delete(Constants.REDIS_ACCESS_TOKEN_PREFIX + userId);
        redisTemplate.delete(Constants.REDIS_REFRESH_TOKEN_PREFIX + userId);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        String codeKey = Constants.REDIS_VERIFY_CODE_PREFIX + request.getEmail();
        Object storedCode = redisTemplate.opsForValue().get(codeKey);
        if (storedCode == null || !storedCode.equals(request.getCode())) {
            throw new BusinessException(ResultCode.VERIFY_CODE_ERROR);
        }

        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getEmail, request.getEmail()));
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setLoginFailCount(0);
        user.setLockTime(null);
        userMapper.updateById(user);

        redisTemplate.delete(codeKey);
        redisTemplate.delete(Constants.REDIS_ACCESS_TOKEN_PREFIX + user.getId());
        redisTemplate.delete(Constants.REDIS_REFRESH_TOKEN_PREFIX + user.getId());
    }

    @Override
    public UserInfo getUserInfo(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return UserInfo.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .avatar(user.getAvatar())
                .role(user.getRole())
                .canCreateProject(user.getCanCreateProject())
                .build();
    }
}
