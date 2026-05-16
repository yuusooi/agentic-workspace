package com.ai.taskboard.service.impl;

import com.ai.taskboard.entity.OperationLog;
import com.ai.taskboard.mapper.OperationLogMapper;
import com.ai.taskboard.service.OperationLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OperationLogServiceImpl implements OperationLogService {

    private final OperationLogMapper operationLogMapper;

    @Override
    public void log(Long userId, String module, String action, Long targetId, String detail, String ip) {
        OperationLog operationLog = new OperationLog();
        operationLog.setUserId(userId);
        operationLog.setModule(module);
        operationLog.setAction(action);
        operationLog.setTargetId(targetId);
        operationLog.setDetail(detail);
        operationLog.setIp(ip);
        operationLogMapper.insert(operationLog);
    }
}
