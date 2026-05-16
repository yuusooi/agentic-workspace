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

@Tag(name = "看板列接口")
@RestController
@RequestMapping("/api/columns")
@RequiredArgsConstructor
public class ColumnController {

    private final BoardColumnService boardColumnService;

    @Operation(summary = "更新看板列")
    @PutMapping("/{id}")
    public Result<BoardColumnVO> updateColumn(@PathVariable Long id,
                                               @RequestBody ColumnUpdateRequest request) {
        return Result.success(boardColumnService.updateColumn(UserContext.getUserId(), id, request));
    }

    @Operation(summary = "删除看板列")
    @DeleteMapping("/{id}")
    public Result<Void> deleteColumn(@PathVariable Long id) {
        boardColumnService.deleteColumn(UserContext.getUserId(), id);
        return Result.success();
    }

    @Operation(summary = "同列任务排序")
    @PutMapping("/{id}/tasks/sort")
    public Result<Void> sortTasksInColumn(@PathVariable Long id,
                                           @RequestBody List<Long> taskIds) {
        boardColumnService.sortTasksInColumn(UserContext.getUserId(), id, taskIds);
        return Result.success();
    }
}
