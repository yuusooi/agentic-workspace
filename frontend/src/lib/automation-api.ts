import apiClient from './api-client';

export type TriggerType =
  | 'TASK_CREATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DEADLINE_APPROACHING'
  | 'TASK_OVERDUE'
  | 'TASK_ASSIGNED';

export type ActionType =
  | 'UPDATE_FIELD'
  | 'ADD_TAG'
  | 'SEND_NOTIFICATION'
  | 'CHANGE_STATUS';

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: string;
}

export interface RuleAction {
  type: ActionType;
  config: Record<string, string>;
}

export interface AutomationRule {
  id: string;
  project_id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: TriggerType;
  conditions: RuleCondition[];
  actions: RuleAction[];
  created_at: string;
  last_executed_at: string | null;
  execution_count: number;
}

export interface RuleExecution {
  id: string;
  rule_id: string;
  rule_name: string;
  trigger_type: TriggerType;
  status: 'success' | 'failed';
  details: string;
  executed_at: string;
}

export async function getAutomationRules(projectId: string): Promise<AutomationRule[]> {
  const res = await apiClient.get(`/projects/${projectId}/rules`);
  return res.data;
}

export async function createAutomationRule(
  projectId: string,
  payload: Omit<AutomationRule, 'id' | 'project_id' | 'created_at' | 'last_executed_at' | 'execution_count'>,
): Promise<AutomationRule> {
  const res = await apiClient.post(`/projects/${projectId}/rules`, payload);
  return res.data;
}

export async function updateAutomationRule(
  _projectId: string,
  ruleId: string,
  payload: Partial<AutomationRule>,
): Promise<void> {
  await apiClient.put(`/rules/${ruleId}`, payload);
}

export async function deleteAutomationRule(
  _projectId: string,
  ruleId: string,
): Promise<void> {
  await apiClient.delete(`/rules/${ruleId}`);
}

export async function toggleAutomationRule(
  _projectId: string,
  ruleId: string,
  isActive: boolean,
): Promise<void> {
  await apiClient.put(`/rules/${ruleId}/toggle`, { enabled: isActive });
}

export async function getRuleDetail(ruleId: string): Promise<AutomationRule> {
  const res = await apiClient.get(`/rules/${ruleId}`);
  return res.data;
}

export async function getRuleExecutions(
  projectId: string,
  ruleId?: string,
): Promise<RuleExecution[]> {
  const params = ruleId ? { rule_id: ruleId } : {};
  const res = await apiClient.get(`/projects/${projectId}/rule-executions`, { params });
  return res.data;
}

export const TRIGGER_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'TASK_CREATED', label: '任务创建' },
  { value: 'TASK_STATUS_CHANGED', label: '任务状态变更' },
  { value: 'TASK_DEADLINE_APPROACHING', label: '截止日期临近' },
  { value: 'TASK_OVERDUE', label: '任务逾期' },
  { value: 'TASK_ASSIGNED', label: '任务分配' },
];

export const TRIGGER_CONDITIONS: Record<TriggerType, { value: string; label: string; operators: { value: string; label: string }[] }[]> = {
  TASK_CREATED: [
    { value: 'priority', label: '优先级', operators: [{ value: 'eq', label: '等于' }, { value: 'in', label: '属于' }] },
    { value: 'assignee_count', label: '负责人数量', operators: [{ value: 'gt', label: '大于' }, { value: 'eq', label: '等于' }] },
  ],
  TASK_STATUS_CHANGED: [
    { value: 'old_status', label: '原状态', operators: [{ value: 'eq', label: '等于' }] },
    { value: 'new_status', label: '新状态', operators: [{ value: 'eq', label: '等于' }] },
  ],
  TASK_DEADLINE_APPROACHING: [
    { value: 'days_before', label: '几天前', operators: [{ value: 'eq', label: '等于' }] },
  ],
  TASK_OVERDUE: [
    { value: 'overdue_days', label: '逾期天数', operators: [{ value: 'gt', label: '大于' }] },
  ],
  TASK_ASSIGNED: [
    { value: 'assignee', label: '负责人', operators: [{ value: 'eq', label: '等于' }] },
  ],
};

export const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'UPDATE_FIELD', label: '更新字段' },
  { value: 'ADD_TAG', label: '添加标签' },
  { value: 'SEND_NOTIFICATION', label: '发送通知' },
  { value: 'CHANGE_STATUS', label: '变更状态' },
];
