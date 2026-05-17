package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.ai.AiOperationLogVO;

public interface AiOperationLogService {
    PageResult<AiOperationLogVO> getOperationLogs(Long userId, Integer page, Integer size);
}
