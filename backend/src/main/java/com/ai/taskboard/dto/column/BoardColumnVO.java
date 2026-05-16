package com.ai.taskboard.dto.column;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BoardColumnVO {
    private Long id;
    private String name;
    private Integer sortOrder;
    private String statusMapping;
    private LocalDateTime createdAt;
}
