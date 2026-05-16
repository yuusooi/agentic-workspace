package com.ai.taskboard.dto.tag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TagCreateRequest {
    @NotBlank(message = "标签名称不能为空")
    @Size(max = 50, message = "标签名称最长50字符")
    private String name;

    private String color = "#409EFF";
}
