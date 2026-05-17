package com.ai.taskboard.service.impl;

import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.dto.automation.AutomationRuleCreateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleUpdateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleVO;
import com.ai.taskboard.entity.AutomationRule;
import com.ai.taskboard.mapper.AutomationRuleMapper;
import com.ai.taskboard.service.AutomationRuleService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AutomationRuleServiceImpl implements AutomationRuleService {

    private final AutomationRuleMapper automationRuleMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<AutomationRuleVO> getRules(Long projectId) {
        List<AutomationRule> rules = automationRuleMapper.selectList(
                new LambdaQueryWrapper<AutomationRule>()
                        .eq(AutomationRule::getProjectId, projectId)
                        .orderByDesc(AutomationRule::getCreatedAt));
        return rules.stream().map(this::convertToVO).toList();
    }

    @Override
    @Transactional
    public AutomationRuleVO createRule(Long userId, Long projectId, AutomationRuleCreateRequest request) {
        AutomationRule rule = new AutomationRule();
        rule.setProjectId(projectId);
        rule.setName(request.getName());
        rule.setTriggerType(request.getTriggerType());
        rule.setTriggerConfig(toJson(request.getTriggerConfig()));
        rule.setConditions(toJson(request.getConditions()));
        rule.setActions(toJson(request.getActions()));
        rule.setEnabled(1);
        rule.setConsecutiveFailures(0);
        rule.setCreatedBy(userId);
        automationRuleMapper.insert(rule);
        return convertToVO(rule);
    }

    @Override
    @Transactional
    public AutomationRuleVO updateRule(Long userId, Long ruleId, AutomationRuleUpdateRequest request) {
        AutomationRule rule = automationRuleMapper.selectById(ruleId);
        if (rule == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (request.getName() != null) rule.setName(request.getName());
        if (request.getTriggerType() != null) rule.setTriggerType(request.getTriggerType());
        if (request.getTriggerConfig() != null) rule.setTriggerConfig(toJson(request.getTriggerConfig()));
        if (request.getConditions() != null) rule.setConditions(toJson(request.getConditions()));
        if (request.getActions() != null) rule.setActions(toJson(request.getActions()));
        if (request.getEnabled() != null) rule.setEnabled(request.getEnabled() ? 1 : 0);
        automationRuleMapper.updateById(rule);
        return convertToVO(rule);
    }

    @Override
    @Transactional
    public void deleteRule(Long userId, Long ruleId) {
        AutomationRule rule = automationRuleMapper.selectById(ruleId);
        if (rule == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        automationRuleMapper.deleteById(ruleId);
    }

    @Override
    @Transactional
    public void toggleRule(Long userId, Long ruleId, Boolean enabled) {
        AutomationRule rule = automationRuleMapper.selectById(ruleId);
        if (rule == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        rule.setEnabled(enabled ? 1 : 0);
        automationRuleMapper.updateById(rule);
    }

    @Override
    public AutomationRuleVO getRuleDetail(Long ruleId) {
        AutomationRule rule = automationRuleMapper.selectById(ruleId);
        if (rule == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        return convertToVO(rule);
    }

    private AutomationRuleVO convertToVO(AutomationRule rule) {
        AutomationRuleVO vo = new AutomationRuleVO();
        vo.setId(rule.getId());
        vo.setProjectId(rule.getProjectId());
        vo.setName(rule.getName());
        vo.setIsActive(rule.getEnabled() != null && rule.getEnabled() == 1);
        vo.setTriggerType(rule.getTriggerType());
        vo.setConditions(parseJsonToList(rule.getConditions()));
        vo.setActions(parseJsonToList(rule.getActions()));
        vo.setCreatedAt(rule.getCreatedAt());
        vo.setLastExecutedAt(null);
        vo.setExecutionCount(0);
        return vo;
    }

    private List<Map<String, Object>> parseJsonToList(String json) {
        if (json == null || json.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String toJson(Object obj) {
        if (obj == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
        }
    }
}
