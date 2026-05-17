package com.ai.taskboard.service;

import com.ai.taskboard.dto.knowledge.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

public interface KnowledgeBaseService {
    List<KnowledgeBaseVO> getKnowledgeBases(Long projectId);
    KnowledgeBaseVO createKnowledgeBase(Long projectId, KnowledgeBaseCreateRequest request);
    void updateKnowledgeBase(Long projectId, Long kbId, KnowledgeBaseUpdateRequest request);
    void deleteKnowledgeBase(Long kbId);
    List<KnowledgeDocumentVO> getDocuments(Long kbId);
    KnowledgeDocumentVO uploadDocument(Long kbId, MultipartFile file);
    void deleteDocument(Long docId);
    List<DocumentChunkVO> getDocumentChunks(Long docId);
    SseEmitter askKnowledgeBase(Long userId, Long kbId, AskRequest request);
}
