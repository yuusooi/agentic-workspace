package com.ai.taskboard.service;

import com.ai.taskboard.common.result.PageResult;
import com.ai.taskboard.dto.comment.CommentCreateRequest;
import com.ai.taskboard.dto.comment.CommentVO;
import com.ai.taskboard.dto.task.*;
import com.ai.taskboard.entity.TaskStatusHistory;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TaskService {
    TaskVO createTask(Long userId, TaskCreateRequest request);
    TaskVO updateTask(Long userId, Long taskId, TaskUpdateRequest request);
    void deleteTask(Long userId, Long taskId);
    TaskVO getTask(Long userId, Long taskId);
    PageResult<TaskVO> listTasks(Long userId, TaskQueryRequest request);
    TaskVO updateStatus(Long userId, Long taskId, StatusUpdateRequest request);
    void assignUsers(Long userId, Long taskId, List<Long> userIds);
    void removeAssignee(Long userId, Long taskId, Long assigneeUserId);
    AttachmentVO uploadAttachment(Long userId, Long taskId, MultipartFile file);
    void deleteAttachment(Long userId, Long attachmentId);
    CommentVO addComment(Long userId, Long taskId, CommentCreateRequest request);
    PageResult<CommentVO> listComments(Long userId, Long taskId, Integer page, Integer size);
    void setTags(Long userId, Long taskId, List<Long> tagIds);
    PageResult<TaskStatusHistory> getStatusHistory(Long userId, Long taskId, Integer page, Integer size);
}
