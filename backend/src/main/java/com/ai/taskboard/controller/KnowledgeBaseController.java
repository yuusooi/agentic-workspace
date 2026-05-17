package com.ai.taskboard.controller;

import com.ai.taskboard.common.result.Result;
import com.ai.taskboard.common.util.UserContext;
import com.ai.taskboard.dto.knowledge.*;
import com.ai.taskboard.service.KnowledgeBaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@Tag(name = "知识库接口")
@RestController
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    @Operation(summary = "获取项目知识库列表")
    @GetMapping("/api/projects/{projectId}/knowledge-bases")
    public Result<List<KnowledgeBaseVO>> getKnowledgeBases(@PathVariable Long projectId) {
        return Result.success(knowledgeBaseService.getKnowledgeBases(projectId));
    }

    @Operation(summary = "创建知识库")
    @PostMapping("/api/projects/{projectId}/knowledge-bases")
    public Result<KnowledgeBaseVO> createKnowledgeBase(@PathVariable Long projectId,
                                                        @Valid @RequestBody KnowledgeBaseCreateRequest request) {
        return Result.success(knowledgeBaseService.createKnowledgeBase(projectId, request));
    }

    @Operation(summary = "更新知识库")
    @PutMapping("/api/projects/{projectId}/knowledge-bases/{kbId}")
    public Result<Void> updateKnowledgeBase(@PathVariable Long projectId,
                                             @PathVariable Long kbId,
                                             @RequestBody KnowledgeBaseUpdateRequest request) {
        knowledgeBaseService.updateKnowledgeBase(projectId, kbId, request);
        return Result.success();
    }

    @Operation(summary = "删除知识库")
    @DeleteMapping("/api/projects/{projectId}/knowledge-bases/{kbId}")
    public Result<Void> deleteKnowledgeBase(@PathVariable Long projectId,
                                             @PathVariable Long kbId) {
        knowledgeBaseService.deleteKnowledgeBase(kbId);
        return Result.success();
    }

    @Operation(summary = "获取知识库文档列表")
    @GetMapping("/api/knowledge-bases/{kbId}/documents")
    public Result<List<KnowledgeDocumentVO>> getDocuments(@PathVariable Long kbId) {
        return Result.success(knowledgeBaseService.getDocuments(kbId));
    }

    @Operation(summary = "上传文档")
    @PostMapping(value = "/api/knowledge-bases/{kbId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<KnowledgeDocumentVO> uploadDocument(@PathVariable Long kbId,
                                                       @RequestParam("file") MultipartFile file) {
        return Result.success(knowledgeBaseService.uploadDocument(kbId, file));
    }

    @Operation(summary = "删除文档")
    @DeleteMapping("/api/documents/{docId}")
    public Result<Void> deleteDocument(@PathVariable Long docId) {
        knowledgeBaseService.deleteDocument(docId);
        return Result.success();
    }

    @Operation(summary = "获取文档分块列表")
    @GetMapping("/api/documents/{docId}/chunks")
    public Result<List<DocumentChunkVO>> getDocumentChunks(@PathVariable Long docId) {
        return Result.success(knowledgeBaseService.getDocumentChunks(docId));
    }

    @Operation(summary = "知识库问答")
    @PostMapping("/api/knowledge-bases/{kbId}/ask")
    public SseEmitter askKnowledgeBase(@PathVariable Long kbId,
                                        @Valid @RequestBody AskRequest request) {
        return knowledgeBaseService.askKnowledgeBase(UserContext.getUserId(), kbId, request);
    }
}
