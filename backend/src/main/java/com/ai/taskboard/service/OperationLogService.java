package com.ai.taskboard.service;

import com.ai.taskboard.entity.OperationLog;

public interface OperationLogService {
    void log(Long userId, String module, String action, Long targetId, String detail, String ip);
}
