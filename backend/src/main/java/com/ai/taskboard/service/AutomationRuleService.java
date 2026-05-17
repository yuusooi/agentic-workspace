package com.ai.taskboard.service;

import com.ai.taskboard.dto.automation.AutomationRuleCreateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleUpdateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleVO;

import java.util.List;

public interface AutomationRuleService {
    List<AutomationRuleVO> getRules(Long projectId);
    AutomationRuleVO createRule(Long userId, Long projectId, AutomationRuleCreateRequest request);
    AutomationRuleVO updateRule(Long userId, Long ruleId, AutomationRuleUpdateRequest request);
    void deleteRule(Long userId, Long ruleId);
    void toggleRule(Long userId, Long ruleId, Boolean enabled);
    AutomationRuleVO getRuleDetail(Long ruleId);
}
