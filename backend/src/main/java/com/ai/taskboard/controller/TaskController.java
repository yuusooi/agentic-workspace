package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.comment.CommentCreateRequest;
import com.ai.taskboard.dto.comment.CommentVO;
import com.ai.taskboard.dto.task.*;
import com.ai.taskboard.entity.TaskStatusHistory;
import com.ai.taskboard.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "任务接口")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "创建任务")
    @PostMapping
    public Result<TaskVO> createTask(@Valid @RequestBody TaskCreateRequest request) {
        return Result.success(taskService.createTask(UserContext.getUserId(), request));
    }

    @Operation(summary = "更新任务")
    @PutMapping("/{id}")
    public Result<TaskVO> updateTask(@PathVariable Long id, @RequestBody TaskUpdateRequest request) {
        return Result.success(taskService.updateTask(UserContext.getUserId(), id, request));
    }

    @Operation(summary = "删除任务")
    @DeleteMapping("/{id}")
    public Result<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(UserContext.getUserId(), id);
        return Result.success();
    }

    @Operation(summary = "获取任务详情")
    @GetMapping("/{id}")
    public Result<TaskVO> getTask(@PathVariable Long id) {
        return Result.success(taskService.getTask(UserContext.getUserId(), id));
    }

    @Operation(summary = "任务列表")
    @GetMapping
    public Result<PageResult<TaskVO>> listTasks(TaskQueryRequest request) {
        return Result.success(taskService.listTasks(UserContext.getUserId(), request));
    }

    @Operation(summary = "更新任务状态")
    @PutMapping("/{id}/status")
    public Result<TaskVO> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        return Result.success(taskService.updateStatus(UserContext.getUserId(), id, request));
    }

    @Operation(summary = "分配负责人")
    @PostMapping("/{id}/assignees")
    public Result<Void> assignUsers(@PathVariable Long id, @RequestBody List<Long> userIds) {
        taskService.assignUsers(UserContext.getUserId(), id, userIds);
        return Result.success();
    }

    @Operation(summary = "移除负责人")
    @DeleteMapping("/{id}/assignees/{userId}")
    public Result<Void> removeAssignee(@PathVariable Long id, @PathVariable Long userId) {
        taskService.removeAssignee(UserContext.getUserId(), id, userId);
        return Result.success();
    }

    @Operation(summary = "上传附件")
    @PostMapping("/{id}/attachments")
    public Result<String> uploadAttachment(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return Result.success(taskService.uploadAttachment(UserContext.getUserId(), id, file));
    }

    @Operation(summary = "删除附件")
    @DeleteMapping("/attachments/{attachmentId}")
    public Result<Void> deleteAttachment(@PathVariable Long attachmentId) {
        taskService.deleteAttachment(UserContext.getUserId(), attachmentId);
        return Result.success();
    }

    @Operation(summary = "添加评论")
    @PostMapping("/{id}/comments")
    public Result<CommentVO> addComment(@PathVariable Long id, @Valid @RequestBody CommentCreateRequest request) {
        return Result.success(taskService.addComment(UserContext.getUserId(), id, request));
    }

    @Operation(summary = "评论列表")
    @GetMapping("/{id}/comments")
    public Result<PageResult<CommentVO>> listComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(taskService.listComments(UserContext.getUserId(), id, page, size));
    }

    @Operation(summary = "设置标签")
    @PutMapping("/{id}/tags")
    public Result<Void> setTags(@PathVariable Long id, @RequestBody List<Long> tagIds) {
        taskService.setTags(UserContext.getUserId(), id, tagIds);
        return Result.success();
    }

    @Operation(summary = "状态变更历史")
    @GetMapping("/{id}/status-history")
    public Result<PageResult<TaskStatusHistory>> getStatusHistory(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        return Result.success(taskService.getStatusHistory(UserContext.getUserId(), id, page, size));
    }
}
