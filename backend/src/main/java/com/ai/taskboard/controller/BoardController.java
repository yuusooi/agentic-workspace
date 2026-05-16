package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.column.*;
import com.ai.taskboard.service.BoardColumnService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "看板接口")
@RestController
@RequestMapping("/api/projects/{projectId}/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardColumnService boardColumnService;

    @Operation(summary = "获取看板")
    @GetMapping
    public Result<List<BoardColumnVO>> getBoard(@PathVariable Long projectId) {
        return Result.success(boardColumnService.getBoard(UserContext.getUserId(), projectId));
    }

    @Operation(summary = "创建看板列")
    @PostMapping("/columns")
    public Result<BoardColumnVO> createColumn(@PathVariable Long projectId,
                                               @Valid @RequestBody ColumnCreateRequest request) {
        return Result.success(boardColumnService.createColumn(UserContext.getUserId(), projectId, request));
    }

    @Operation(summary = "列排序")
    @PutMapping("/columns/sort")
    public Result<Void> sortColumns(@PathVariable Long projectId,
                                     @Valid @RequestBody ColumnSortRequest request) {
        boardColumnService.sortColumns(UserContext.getUserId(), projectId, request);
        return Result.success();
    }
}
