package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.tag.TagCreateRequest;
import com.ai.taskboard.dto.tag.TagVO;
import com.ai.taskboard.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "标签接口")
@RestController
@RequestMapping("/api/projects/{projectId}/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @Operation(summary = "标签列表")
    @GetMapping
    public Result<List<TagVO>> listTags(@PathVariable Long projectId) {
        return Result.success(tagService.listTags(UserContext.getUserId(), projectId));
    }

    @Operation(summary = "创建标签")
    @PostMapping
    public Result<TagVO> createTag(@PathVariable Long projectId, @Valid @RequestBody TagCreateRequest request) {
        return Result.success(tagService.createTag(UserContext.getUserId(), projectId, request));
    }

    @Operation(summary = "删除标签")
    @DeleteMapping("/{tagId}")
    public Result<Void> deleteTag(@PathVariable Long projectId, @PathVariable Long tagId) {
        tagService.deleteTag(UserContext.getUserId(), tagId);
        return Result.success();
    }
}
