package com.ai.taskboard.entity;

import com.ai.taskboard.common.base.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("task")
public class Task extends BaseEntity {

    private Long projectId;
    private Long columnId;
    private String title;
    private String description;
    private String priority;
    private String status;
    private Integer sortOrder;
    private LocalDate dueDate;
    private Long creatorId;
    @Version
    private Integer version;
}
