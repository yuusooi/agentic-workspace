package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("document_chunk")
public class DocumentChunk extends BaseEntity {
    private Long documentId;
    private String content;
    private Integer chunkIndex;
    private String embedding;
}
