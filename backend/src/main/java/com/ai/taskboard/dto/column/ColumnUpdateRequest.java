package com.ai.taskboard.dto.column;

import lombok.Data;

@Data
public class ColumnUpdateRequest {
    private String name;
    private String statusMapping;
}
