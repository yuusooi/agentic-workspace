package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.ai.AiOperationLogVO;
import com.ai.taskboard.entity.AiOperationLog;
import com.ai.taskboard.entity.User;
import com.ai.taskboard.mapper.AiOperationLogMapper;
import com.ai.taskboard.mapper.UserMapper;
import com.ai.taskboard.service.AiOperationLogService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiOperationLogServiceImpl implements AiOperationLogService {

    private final AiOperationLogMapper aiOperationLogMapper;
    private final UserMapper userMapper;

    @Override
    public PageResult<AiOperationLogVO> getOperationLogs(Long userId, Integer page, Integer size) {
        Page<AiOperationLog> logPage = aiOperationLogMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<AiOperationLog>()
                        .orderByDesc(AiOperationLog::getCreatedAt));

        List<AiOperationLogVO> vos = logPage.getRecords().stream().map(logEntry -> {
            AiOperationLogVO vo = new AiOperationLogVO();
            vo.setId(logEntry.getId());
            vo.setUserId(logEntry.getUserId());
            User opUser = userMapper.selectById(logEntry.getUserId());
            vo.setUserName(opUser != null ? (opUser.getNickname() != null ? opUser.getNickname() : opUser.getUsername()) : "未知用户");
            vo.setPrompt(logEntry.getPrompt());
            vo.setAiThinking(logEntry.getAiThinking());
            vo.setToolCalls(parseJsonToObject(logEntry.getToolCalls()));
            vo.setAiOutput(logEntry.getAiOutput());
            vo.setDiffPreview(parseJsonToObject(logEntry.getDiffPreview()));
            vo.setUserAction(logEntry.getUserAction());
            vo.setExecutedAction(parseJsonToObject(logEntry.getExecutedAction()));
            vo.setCreatedAt(logEntry.getCreatedAt());
            return vo;
        }).collect(Collectors.toList());

        return new PageResult<>(vos, logPage.getTotal(), (int) logPage.getPages());
    }

    private Object parseJsonToObject(String json) {
        if (json == null || json.isEmpty()) return null;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(json, Object.class);
        } catch (Exception e) {
            return json;
        }
    }
}
