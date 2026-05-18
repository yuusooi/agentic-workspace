package com.ai.taskboard.service.impl;

import cn.hutool.core.io.FileUtil;
import com.ai.taskboard.common.exception.BusinessException;
import com.ai.taskboard.common.result.ResultCode;
import com.ai.taskboard.config.AiLlmConfig;
import com.ai.taskboard.dto.knowledge.*;
import com.ai.taskboard.entity.Document;
import com.ai.taskboard.entity.DocumentChunk;
import com.ai.taskboard.entity.KnowledgeBase;
import com.ai.taskboard.mapper.DocumentChunkMapper;
import com.ai.taskboard.mapper.DocumentMapper;
import com.ai.taskboard.mapper.KnowledgeBaseMapper;
import com.ai.taskboard.service.KnowledgeBaseService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeBaseMapper knowledgeBaseMapper;
    private final DocumentMapper documentMapper;
    private final DocumentChunkMapper documentChunkMapper;
    private final ObjectMapper objectMapper;
    private final WebClient aiWebClient;
    private final AiLlmConfig aiLlmConfig;

    @Value("${file.upload-path:./uploads}")
    private String uploadPath;

    public KnowledgeBaseServiceImpl(KnowledgeBaseMapper knowledgeBaseMapper,
                                    DocumentMapper documentMapper,
                                    DocumentChunkMapper documentChunkMapper,
                                    ObjectMapper objectMapper,
                                    @Qualifier("aiWebClient") WebClient aiWebClient,
                                    AiLlmConfig aiLlmConfig) {
        this.knowledgeBaseMapper = knowledgeBaseMapper;
        this.documentMapper = documentMapper;
        this.documentChunkMapper = documentChunkMapper;
        this.objectMapper = objectMapper;
        this.aiWebClient = aiWebClient;
        this.aiLlmConfig = aiLlmConfig;
    }

    @Override
    public List<KnowledgeBaseVO> getKnowledgeBases(Long projectId) {
        List<KnowledgeBase> kbs = knowledgeBaseMapper.selectList(
                new LambdaQueryWrapper<KnowledgeBase>()
                        .eq(KnowledgeBase::getProjectId, projectId)
                        .orderByDesc(KnowledgeBase::getCreatedAt));
        return kbs.stream().map(this::convertToKBVO).toList();
    }

    @Override
    @Transactional
    public KnowledgeBaseVO createKnowledgeBase(Long projectId, KnowledgeBaseCreateRequest request) {
        KnowledgeBase kb = new KnowledgeBase();
        kb.setProjectId(projectId);
        kb.setName(request.getName());
        kb.setDescription(request.getDescription());
        kb.setChunkSize(2000);
        kb.setChunkOverlap(200);
        kb.setTopK(5);
        kb.setSimilarityThreshold(new BigDecimal("0.50"));
        knowledgeBaseMapper.insert(kb);
        return convertToKBVO(kb);
    }

    @Override
    @Transactional
    public void updateKnowledgeBase(Long projectId, Long kbId, KnowledgeBaseUpdateRequest request) {
        KnowledgeBase kb = knowledgeBaseMapper.selectById(kbId);
        if (kb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (!kb.getProjectId().equals(projectId)) {
            throw new BusinessException(ResultCode.FORBIDDEN);
        }
        if (request.getName() != null) kb.setName(request.getName());
        if (request.getDescription() != null) kb.setDescription(request.getDescription());
        knowledgeBaseMapper.updateById(kb);
    }

    @Override
    @Transactional
    public void deleteKnowledgeBase(Long kbId) {
        KnowledgeBase kb = knowledgeBaseMapper.selectById(kbId);
        if (kb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        List<Document> docs = documentMapper.selectList(
                new LambdaQueryWrapper<Document>().eq(Document::getKnowledgeBaseId, kbId));
        for (Document doc : docs) {
            documentChunkMapper.delete(new LambdaQueryWrapper<DocumentChunk>()
                    .eq(DocumentChunk::getDocumentId, doc.getId()));
            documentMapper.deleteById(doc.getId());
        }
        knowledgeBaseMapper.deleteById(kbId);
    }

    @Override
    public List<KnowledgeDocumentVO> getDocuments(Long kbId) {
        List<Document> docs = documentMapper.selectList(
                new LambdaQueryWrapper<Document>()
                        .eq(Document::getKnowledgeBaseId, kbId)
                        .orderByDesc(Document::getCreatedAt));
        return docs.stream().map(this::convertToDocVO).toList();
    }

    @Override
    @Transactional
    public KnowledgeDocumentVO uploadDocument(Long kbId, MultipartFile file) {
        KnowledgeBase kb = knowledgeBaseMapper.selectById(kbId);
        if (kb == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        if (file.isEmpty()) {
            throw new BusinessException("文件不能为空");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;

        String docDir = uploadPath + "/knowledge";
        File dir = new File(docDir).getAbsoluteFile();
        if (!dir.exists()) {
            dir.mkdirs();
        }
        File dest = new File(dir, fileName);

        try {
            file.transferTo(dest.getAbsoluteFile());
        } catch (IOException e) {
            log.error("文件上传失败, dest path: {}, error: {}", dest.getAbsolutePath(), e.getMessage(), e);
            throw new BusinessException("文件上传失败: " + e.getMessage());
        }

        Document document = new Document();
        document.setKnowledgeBaseId(kbId);
        document.setFileName(originalFilename);
        document.setFileUrl("/uploads/knowledge/" + fileName);
        document.setFileSize(file.getSize());
        document.setChunkCount(0);
        document.setStatus("PENDING");
        documentMapper.insert(document);

        processDocument(document, kb);

        return convertToDocVO(document);
    }

    @Override
    @Transactional
    public void deleteDocument(Long docId) {
        Document doc = documentMapper.selectById(docId);
        if (doc == null) {
            throw new BusinessException(ResultCode.NOT_FOUND);
        }
        documentChunkMapper.delete(new LambdaQueryWrapper<DocumentChunk>()
                .eq(DocumentChunk::getDocumentId, docId));
        documentMapper.deleteById(docId);
    }

    @Override
    public List<DocumentChunkVO> getDocumentChunks(Long docId) {
        List<DocumentChunk> chunks = documentChunkMapper.selectList(
                new LambdaQueryWrapper<DocumentChunk>()
                        .eq(DocumentChunk::getDocumentId, docId)
                        .orderByAsc(DocumentChunk::getChunkIndex));
        return chunks.stream().map(this::convertToChunkVO).toList();
    }

    @Override
    public SseEmitter askKnowledgeBase(Long userId, Long kbId, AskRequest request) {
        SseEmitter emitter = new SseEmitter(aiLlmConfig.getSse().getTimeout());

        KnowledgeBase kb = knowledgeBaseMapper.selectById(kbId);
        if (kb == null) {
            try {
                emitter.send(SseEmitter.event().name("error").data("知识库不存在"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        List<Document> docs = documentMapper.selectList(
                new LambdaQueryWrapper<Document>().eq(Document::getKnowledgeBaseId, kbId));
        
        if (docs.isEmpty()) {
            try {
                emitter.send(SseEmitter.event().name("message").data("知识库中暂无文档，请先上传文档。"));
                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }
        
        List<DocumentChunk> allChunks = new ArrayList<>();
        for (Document doc : docs) {
            List<DocumentChunk> chunks = documentChunkMapper.selectList(
                    new LambdaQueryWrapper<DocumentChunk>().eq(DocumentChunk::getDocumentId, doc.getId()));
            allChunks.addAll(chunks);
        }
        
        if (allChunks.isEmpty()) {
            try {
                emitter.send(SseEmitter.event().name("message").data("文档正在处理中，请稍后再试。"));
                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }

        List<DocumentChunk> relevantChunks = keywordMatch(request.getQuestion(), allChunks, kb.getTopK());
        
        if (relevantChunks.isEmpty()) {
            try {
                emitter.send(SseEmitter.event().name("message").data("抱歉，在知识库中没有找到与您问题相关的内容。"));
                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                emitter.complete();
            } catch (Exception ignored) {}
            return emitter;
        }
        
        String context = relevantChunks.stream()
                .map(DocumentChunk::getContent)
                .collect(Collectors.joining("\n\n"));

        String systemPrompt = "你是一个专业的知识库助手。请根据以下知识库内容回答用户的问题。\n\n" +
                "重要规则：\n" +
                "1. 仔细理解用户的问题意图，用你自己的话进行回答\n" +
                "2. 不要直接复制粘贴文档内容，要进行总结和提炼\n" +
                "3. 如果知识库中没有相关内容，请如实告知用户\n" +
                "4. 回答要简洁明了，突出重点\n" +
                "5. 如果用户追问，要结合之前的对话上下文进行回答\n\n" +
                "知识库内容：\n" + context;

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            for (AskRequest.Message msg : request.getHistory()) {
                messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
            }
        }
        messages.add(Map.of("role", "user", "content", request.getQuestion()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", aiLlmConfig.getLlm().getModel());
        requestBody.put("messages", messages);
        requestBody.put("max_tokens", aiLlmConfig.getLlm().getMaxTokens());
        requestBody.put("temperature", aiLlmConfig.getLlm().getTemperature());
        requestBody.put("stream", true);

        final List<Map<String, String>> references = new ArrayList<>();
        for (DocumentChunk chunk : relevantChunks) {
            Document doc = documentMapper.selectById(chunk.getDocumentId());
            if (doc != null) {
                String snippet = chunk.getContent();
                if (snippet.length() > 200) {
                    snippet = snippet.substring(0, 200) + "...";
                }
                references.add(Map.of(
                    "document", doc.getFileName(),
                    "snippet", snippet
                ));
            }
        }

        Disposable disposable = aiWebClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .bodyToFlux(String.class)
                .subscribe(
                        eventData -> {
                            try {
                                if (eventData == null || eventData.isEmpty()) {
                                    return;
                                }
                                if ("[DONE]".equals(eventData)) {
                                    if (!references.isEmpty()) {
                                        String refsJson = objectMapper.writeValueAsString(references);
                                        emitter.send(SseEmitter.event().name("references").data(refsJson));
                                    }
                                    emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                                    emitter.complete();
                                    return;
                                }
                                JsonNode node = objectMapper.readTree(eventData);
                                JsonNode choices = node.get("choices");
                                if (choices != null && choices.isArray() && choices.size() > 0) {
                                    JsonNode delta = choices.get(0).get("delta");
                                    if (delta != null && delta.has("content") && !delta.get("content").isNull()) {
                                        String content = delta.get("content").asText();
                                        emitter.send(SseEmitter.event().name("message").data(content));
                                    }
                                }
                            } catch (Exception e) {
                                log.error("SSE send error", e);
                            }
                        },
                        error -> {
                            log.error("LLM stream error", error);
                            try {
                                emitter.send(SseEmitter.event().name("error").data("AI服务调用失败: " + error.getMessage()));
                                emitter.complete();
                            } catch (Exception ignored) {}
                        },
                        () -> {
                            try {
                                if (!references.isEmpty()) {
                                    String refsJson = objectMapper.writeValueAsString(references);
                                    emitter.send(SseEmitter.event().name("references").data(refsJson));
                                }
                                emitter.send(SseEmitter.event().name("done").data("[DONE]"));
                                emitter.complete();
                            } catch (Exception ignored) {}
                        }
                );

        emitter.onCompletion(disposable::dispose);
        emitter.onTimeout(disposable::dispose);
        emitter.onError(e -> disposable.dispose());

        return emitter;
    }

    private List<DocumentChunk> keywordMatch(String question, List<DocumentChunk> chunks, Integer topK) {
        if (chunks.isEmpty()) {
            return Collections.emptyList();
        }
        String[] keywords = question.toLowerCase().split("[\\s，。？！、；：\u201c\u201d\u2018\u2019\uff08\uff09\\[\\]{}]+");
        List<String> keywordList = Arrays.stream(keywords)
                .filter(k -> k.length() > 1)
                .toList();

        return chunks.stream()
                .sorted((a, b) -> {
                    long scoreA = keywordList.stream().filter(k -> a.getContent().toLowerCase().contains(k)).count();
                    long scoreB = keywordList.stream().filter(k -> b.getContent().toLowerCase().contains(k)).count();
                    return Long.compare(scoreB, scoreA);
                })
                .limit(topK != null ? topK : 5)
                .toList();
    }

    private void processDocument(Document document, KnowledgeBase kb) {
        try {
            File file = new File(uploadPath + "/knowledge", document.getFileUrl().substring(document.getFileUrl().lastIndexOf("/") + 1));
            
            long fileSize = file.length();
            long maxFileSize = 10 * 1024 * 1024;
            if (fileSize > maxFileSize) {
                throw new BusinessException("文件大小超过限制(10MB)");
            }
            
            String content = FileUtil.readString(file, StandardCharsets.UTF_8);

            int chunkSize = kb.getChunkSize() != null ? kb.getChunkSize() : 2000;
            int overlap = kb.getChunkOverlap() != null ? kb.getChunkOverlap() : 200;
            List<String> chunks = chunkText(content, chunkSize, overlap);

            for (int i = 0; i < chunks.size(); i++) {
                DocumentChunk chunk = new DocumentChunk();
                chunk.setDocumentId(document.getId());
                chunk.setContent(chunks.get(i));
                chunk.setChunkIndex(i);
                documentChunkMapper.insert(chunk);
            }

            document.setChunkCount(chunks.size());
            document.setStatus("COMPLETED");
            documentMapper.updateById(document);
        } catch (Exception e) {
            document.setStatus("FAILED");
            documentMapper.updateById(document);
            log.error("Document processing failed: {}", document.getId(), e);
        }
    }

    private List<String> chunkText(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return chunks;
        }
        int step = Math.max(1, chunkSize - overlap);
        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            chunks.add(text.substring(start, end));
            start += step;
        }
        return chunks;
    }

    private KnowledgeBaseVO convertToKBVO(KnowledgeBase kb) {
        KnowledgeBaseVO vo = new KnowledgeBaseVO();
        vo.setId(kb.getId());
        vo.setProjectId(kb.getProjectId());
        vo.setName(kb.getName());
        vo.setDescription(kb.getDescription());
        vo.setCreatedAt(kb.getCreatedAt());

        Long docCount = documentMapper.selectCount(
                new LambdaQueryWrapper<Document>().eq(Document::getKnowledgeBaseId, kb.getId()));
        vo.setDocumentCount(docCount.intValue());

        List<Document> docs = documentMapper.selectList(
                new LambdaQueryWrapper<Document>().eq(Document::getKnowledgeBaseId, kb.getId()));
        int totalChunks = docs.stream().mapToInt(d -> d.getChunkCount() != null ? d.getChunkCount() : 0).sum();
        vo.setChunkCount(totalChunks);

        return vo;
    }

    private KnowledgeDocumentVO convertToDocVO(Document doc) {
        KnowledgeDocumentVO vo = new KnowledgeDocumentVO();
        vo.setId(doc.getId());
        vo.setKnowledgeBaseId(doc.getKnowledgeBaseId());
        vo.setFileName(doc.getFileName());
        vo.setFileType(extractFileType(doc.getFileName()));
        vo.setFileSize(doc.getFileSize() != null ? doc.getFileSize() : 0L);
        vo.setChunkCount(doc.getChunkCount() != null ? doc.getChunkCount() : 0);
        vo.setStatus(doc.getStatus());
        vo.setCreatedAt(doc.getCreatedAt());
        return vo;
    }

    private DocumentChunkVO convertToChunkVO(DocumentChunk chunk) {
        DocumentChunkVO vo = new DocumentChunkVO();
        vo.setId(chunk.getId());
        vo.setDocumentId(chunk.getDocumentId());
        vo.setContent(chunk.getContent());
        vo.setChunkIndex(chunk.getChunkIndex());
        return vo;
    }

    private String extractFileType(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }
}
