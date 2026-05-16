package com.ai.taskboard.dto.tag;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TagVO {
    private Long id;
    private String name;
    private String color;
}
