package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("knowledge_base")
public class KnowledgeBase extends BaseEntity {
    private Long projectId;
    private String name;
    private String description;
    private Integer chunkSize;
    private Integer chunkOverlap;
    private Integer topK;
    private BigDecimal similarityThreshold;
}
