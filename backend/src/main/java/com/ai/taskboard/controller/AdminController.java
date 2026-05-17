package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.dto.admin.AdminUserUpdateRequest;
import com.ai.taskboard.dto.admin.AdminUserVO;
import com.ai.taskboard.dto.project.ProjectVO;
import com.ai.taskboard.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name = "系统管理接口")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "用户列表")
    @GetMapping("/users")
    public Result<PageResult<AdminUserVO>> listUsers(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(adminService.listUsers(page, size, keyword));
    }

    @Operation(summary = "修改用户角色")
    @PutMapping("/users/{id}/role")
    public Result<AdminUserVO> updateUserRole(@PathVariable Long id, @RequestParam String role) {
        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setRole(role);
        return Result.success(adminService.updateUser(id, request));
    }

    @Operation(summary = "启用/禁用用户")
    @PutMapping("/users/{id}/status")
    public Result<AdminUserVO> updateUserStatus(@PathVariable Long id, @RequestParam Integer status) {
        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setStatus(status);
        return Result.success(adminService.updateUser(id, request));
    }

    @Operation(summary = "设置项目创建权限")
    @PutMapping("/users/{id}/create-project-permission")
    public Result<AdminUserVO> setCreateProjectPermission(@PathVariable Long id, @RequestParam Integer canCreateProject) {
        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setCanCreateProject(canCreateProject);
        return Result.success(adminService.updateUser(id, request));
    }

    @Operation(summary = "全部项目列表")
    @GetMapping("/projects")
    public Result<PageResult<ProjectVO>> listAllProjects(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(adminService.listAllProjects(page, size));
    }
}
