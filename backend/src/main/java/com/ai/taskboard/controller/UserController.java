package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.user.PreferenceUpdateRequest;
import com.ai.taskboard.dto.user.UserUpdateRequest;
import com.ai.taskboard.dto.user.UserVO;
import com.ai.taskboard.entity.UserPreference;
import com.ai.taskboard.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "用户接口")
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "获取当前用户信息")
    @GetMapping
    public Result<UserVO> getCurrentUser() {
        return Result.success(userService.getCurrentUser(UserContext.getUserId()));
    }

    @Operation(summary = "更新当前用户信息")
    @PutMapping
    public Result<UserVO> updateCurrentUser(@RequestBody UserUpdateRequest request) {
        return Result.success(userService.updateCurrentUser(UserContext.getUserId(), request));
    }

    @Operation(summary = "上传头像")
    @PostMapping("/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return Result.success(userService.uploadAvatar(UserContext.getUserId(), file));
    }

    @Operation(summary = "获取偏好设置")
    @GetMapping("/preferences")
    public Result<UserPreference> getPreference() {
        return Result.success(userService.getPreference(UserContext.getUserId()));
    }

    @Operation(summary = "更新偏好设置")
    @PutMapping("/preferences")
    public Result<UserPreference> updatePreference(@RequestBody PreferenceUpdateRequest request) {
        return Result.success(userService.updatePreference(UserContext.getUserId(), request));
    }
}
