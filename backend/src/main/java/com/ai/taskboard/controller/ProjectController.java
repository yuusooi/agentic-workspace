package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.project.*;
import com.ai.taskboard.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "项目接口")
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "创建项目")
    @PostMapping
    public Result<ProjectVO> createProject(@Valid @RequestBody ProjectCreateRequest request) {
        return Result.success(projectService.createProject(UserContext.getUserId(), request));
    }

    @Operation(summary = "更新项目")
    @PutMapping("/{id}")
    public Result<ProjectVO> updateProject(@PathVariable Long id, @RequestBody ProjectUpdateRequest request) {
        return Result.success(projectService.updateProject(UserContext.getUserId(), id, request));
    }

    @Operation(summary = "删除项目")
    @DeleteMapping("/{id}")
    public Result<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(UserContext.getUserId(), id);
        return Result.success();
    }

    @Operation(summary = "获取项目详情")
    @GetMapping("/{id}")
    public Result<ProjectVO> getProject(@PathVariable Long id) {
        return Result.success(projectService.getProject(UserContext.getUserId(), id));
    }

    @Operation(summary = "我的项目列表")
    @GetMapping("/mine")
    public Result<PageResult<ProjectVO>> listMyProjects(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(projectService.listMyProjects(UserContext.getUserId(), page, size));
    }

    @Operation(summary = "公开项目列表")
    @GetMapping("/public")
    public Result<PageResult<ProjectVO>> listPublicProjects(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(projectService.listPublicProjects(page, size));
    }

    @Operation(summary = "邀请成员")
    @PostMapping("/{id}/members/invite")
    public Result<Void> inviteMember(@PathVariable Long id, @Valid @RequestBody MemberInviteRequest request) {
        projectService.inviteMember(UserContext.getUserId(), id, request);
        return Result.success();
    }

    @Operation(summary = "移除成员")
    @DeleteMapping("/{id}/members/{userId}")
    public Result<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        projectService.removeMember(UserContext.getUserId(), id, userId);
        return Result.success();
    }

    @Operation(summary = "修改成员角色")
    @PutMapping("/{id}/members/{userId}/role")
    public Result<Void> updateMemberRole(@PathVariable Long id, @PathVariable Long userId,
                                          @RequestParam String role) {
        projectService.updateMemberRole(UserContext.getUserId(), id, userId, role);
        return Result.success();
    }

    @Operation(summary = "项目成员列表")
    @GetMapping("/{id}/members")
    public Result<PageResult<ProjectMemberVO>> listMembers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(projectService.listMembers(UserContext.getUserId(), id, page, size));
    }

    @Operation(summary = "搜索项目成员")
    @GetMapping("/{id}/members/search")
    public Result<List<ProjectMemberVO>> searchMembers(
            @PathVariable Long id,
            @RequestParam String keyword) {
        return Result.success(projectService.searchMembers(UserContext.getUserId(), id, keyword));
    }
}
