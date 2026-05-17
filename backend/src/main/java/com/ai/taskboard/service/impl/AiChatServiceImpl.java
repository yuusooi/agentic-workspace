package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.ai.AiChatMessageVO;
import com.ai.taskboard.dto.ai.AiChatSessionDetailVO;
import com.ai.taskboard.dto.ai.AiChatSessionVO;
import com.ai.taskboard.entity.AiChatMessage;
import com.ai.taskboard.entity.AiChatSession;
import com.ai.taskboard.mapper.AiChatMessageMapper;
import com.ai.taskboard.mapper.AiChatSessionMapper;
import com.ai.taskboard.service.AiChatService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiChatServiceImpl implements AiChatService {

    private final AiChatSessionMapper aiChatSessionMapper;
    private final AiChatMessageMapper aiChatMessageMapper;

    @Override
    public PageResult<AiChatSessionVO> getChatSessions(Long userId, Integer page, Integer size) {
        Page<AiChatSession> sessionPage = aiChatSessionMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getDeleted, 0)
                        .orderByDesc(AiChatSession::getCreatedAt));

        List<AiChatSessionVO> vos = sessionPage.getRecords().stream().map(session -> {
            AiChatSessionVO vo = new AiChatSessionVO();
            vo.setId(session.getId());
            vo.setUserId(session.getUserId());
            vo.setProjectId(session.getProjectId());
            vo.setTitle(session.getTitle());
            vo.setCreatedAt(session.getCreatedAt());

            Long messageCount = aiChatMessageMapper.selectCount(
                    new LambdaQueryWrapper<AiChatMessage>().eq(AiChatMessage::getSessionId, session.getId()));
            vo.setMessageCount(messageCount.intValue());

            return vo;
        }).collect(Collectors.toList());

        return new PageResult<>(vos, sessionPage.getTotal(), (int) sessionPage.getPages());
    }

    @Override
    public AiChatSessionDetailVO getChatSessionDetail(Long userId, Long sessionId) {
        AiChatSession session = aiChatSessionMapper.selectOne(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getId, sessionId)
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getDeleted, 0));

        if (session == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        AiChatSessionDetailVO vo = new AiChatSessionDetailVO();
        vo.setId(session.getId());
        vo.setUserId(session.getUserId());
        vo.setProjectId(session.getProjectId());
        vo.setTitle(session.getTitle());
        vo.setCreatedAt(session.getCreatedAt());

        Long messageCount = aiChatMessageMapper.selectCount(
                new LambdaQueryWrapper<AiChatMessage>().eq(AiChatMessage::getSessionId, sessionId));
        vo.setMessageCount(messageCount.intValue());

        List<AiChatMessage> messages = aiChatMessageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessage>()
                        .eq(AiChatMessage::getSessionId, sessionId)
                        .orderByAsc(AiChatMessage::getCreatedAt));

        List<AiChatMessageVO> messageVOs = messages.stream().map(msg -> {
            AiChatMessageVO msgVO = new AiChatMessageVO();
            msgVO.setId(msg.getId());
            msgVO.setSessionId(msg.getSessionId());
            msgVO.setRole(msg.getRole());
            msgVO.setContent(msg.getContent());
            msgVO.setToolCalls(parseJsonToObject(msg.getToolCalls()));
            msgVO.setReferences(parseJsonToObject(msg.getReferences()));
            msgVO.setCreatedAt(msg.getCreatedAt());
            return msgVO;
        }).collect(Collectors.toList());

        vo.setMessages(messageVOs);
        return vo;
    }

    @Override
    public void deleteChatSession(Long userId, Long sessionId) {
        AiChatSession session = aiChatSessionMapper.selectOne(
                new LambdaQueryWrapper<AiChatSession>()
                        .eq(AiChatSession::getId, sessionId)
                        .eq(AiChatSession::getUserId, userId)
                        .eq(AiChatSession::getDeleted, 0));

        if (session == null) {
            throw new com.ai.taskboard.common.exception.BusinessException(com.ai.taskboard.common.result.ResultCode.NOT_FOUND);
        }

        session.setDeleted(1);
        aiChatSessionMapper.updateById(session);
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
