package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.automation.AutomationRuleCreateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleToggleRequest;
import com.ai.taskboard.dto.automation.AutomationRuleUpdateRequest;
import com.ai.taskboard.dto.automation.AutomationRuleVO;
import com.ai.taskboard.service.AutomationRuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Tag(name = "自动化规则接口")
@RestController
@RequiredArgsConstructor
public class AutomationRuleController {

    private final AutomationRuleService automationRuleService;

    @Operation(summary = "获取项目规则列表")
    @GetMapping("/api/projects/{projectId}/rules")
    public Result<List<AutomationRuleVO>> getRules(@PathVariable Long projectId) {
        return Result.success(automationRuleService.getRules(projectId));
    }

    @Operation(summary = "创建自动化规则")
    @PostMapping("/api/projects/{projectId}/rules")
    public Result<AutomationRuleVO> createRule(@PathVariable Long projectId,
                                                @Valid @RequestBody AutomationRuleCreateRequest request) {
        return Result.success(automationRuleService.createRule(UserContext.getUserId(), projectId, request));
    }

    @Operation(summary = "更新自动化规则")
    @PutMapping("/api/rules/{ruleId}")
    public Result<AutomationRuleVO> updateRule(@PathVariable Long ruleId,
                                                @RequestBody AutomationRuleUpdateRequest request) {
        return Result.success(automationRuleService.updateRule(UserContext.getUserId(), ruleId, request));
    }

    @Operation(summary = "删除自动化规则")
    @DeleteMapping("/api/rules/{ruleId}")
    public Result<Void> deleteRule(@PathVariable Long ruleId) {
        automationRuleService.deleteRule(UserContext.getUserId(), ruleId);
        return Result.success();
    }

    @Operation(summary = "切换规则启用状态")
    @PutMapping("/api/rules/{ruleId}/toggle")
    public Result<Void> toggleRule(@PathVariable Long ruleId,
                                    @Valid @RequestBody AutomationRuleToggleRequest request) {
        automationRuleService.toggleRule(UserContext.getUserId(), ruleId, request.getEnabled());
        return Result.success();
    }

    @Operation(summary = "获取规则详情")
    @GetMapping("/api/rules/{ruleId}")
    public Result<AutomationRuleVO> getRuleDetail(@PathVariable Long ruleId) {
        return Result.success(automationRuleService.getRuleDetail(ruleId));
    }

    @Operation(summary = "获取规则执行记录")
    @GetMapping("/api/projects/{projectId}/rule-executions")
    public Result<List<Map<String, Object>>> getRuleExecutions(@PathVariable Long projectId) {
        return Result.success(Collections.emptyList());
    }
}
