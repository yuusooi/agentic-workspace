package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("board_column")
public class BoardColumn extends BaseEntity {

    private Long projectId;
    private String name;
    private Integer sortOrder;
    private String statusMapping;
}
