package com.reconciliation.service;

import com.reconciliation.model.ReconciliationProgress;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class ReconciliationProgressService {
    private final ConcurrentHashMap<String, ReconciliationProgress> progressMap = new ConcurrentHashMap<>();

    public void updateProgress(String sessionId, ReconciliationProgress progress) {
        progressMap.put(sessionId, progress);
    }

    public ReconciliationProgress getProgress(String sessionId) {
        return progressMap.getOrDefault(sessionId, new ReconciliationProgress(0, "En attente", 0, 0));
    }

    public void clearProgress(String sessionId) {
        progressMap.remove(sessionId);
    }

    public void createJob(String jobId, String message) {
        ReconciliationProgress progress = new ReconciliationProgress(0, message, 0, 0);
        progressMap.put(jobId, progress);
    }
} 