package com.ai.taskboard.service;

import com.ai.taskboard.dto.column.*;

import java.util.List;

public interface BoardColumnService {
    List<BoardColumnVO> getBoard(Long userId, Long projectId);
    BoardColumnVO createColumn(Long userId, Long projectId, ColumnCreateRequest request);
    BoardColumnVO updateColumn(Long userId, Long columnId, ColumnUpdateRequest request);
    void deleteColumn(Long userId, Long columnId);
    void sortColumns(Long userId, Long projectId, ColumnSortRequest request);
    void sortTasksInColumn(Long userId, Long columnId, List<Long> taskIds);
}
