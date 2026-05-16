package com.ai.taskboard.common.result;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
@Schema(description = "分页响应结果")
public class PageResult<T> implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "数据列表")
    private List<T> content;

    @Schema(description = "总元素数")
    private Long totalElements;

    @Schema(description = "总页数")
    private Integer totalPages;

    public PageResult() {}

    public PageResult(List<T> content, Long totalElements, Integer totalPages) {
        this.content = content;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }
}
