package com.ai.taskboard.dto.column;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class ColumnSortRequest {
    @NotNull(message = "排序列表不能为空")
    private List<SortItem> columns;

    @Data
    public static class SortItem {
        @NotNull(message = "列ID不能为空")
        private Long columnId;
        @NotNull(message = "排序值不能为空")
        private Integer sortOrder;
    }
}
