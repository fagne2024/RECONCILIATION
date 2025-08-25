package com.reconciliation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reconciliation.dto.WebSocketMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class SimpleWebSocketController extends TextWebSocketHandler {
    
    @Autowired
    private ObjectMapper objectMapper;
    
    // Stockage des sessions actives
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        sessions.put(sessionId, session);
        log.info("✅ Connexion WebSocket établie: {}", sessionId);
        
        // Envoyer un message de confirmation
        WebSocketMessage welcomeMessage = new WebSocketMessage();
        welcomeMessage.setType("CONNECTION_STATUS");
        welcomeMessage.setPayload(Map.of("status", "connected", "sessionId", sessionId));
        welcomeMessage.setTimestamp(System.currentTimeMillis());
        
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(welcomeMessage)));
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            String payload = message.getPayload();
            log.info("📨 Message reçu de {}: {}", session.getId(), payload);
            
            WebSocketMessage wsMessage = objectMapper.readValue(payload, WebSocketMessage.class);
            
            // Traiter le message selon son type
            switch (wsMessage.getType()) {
                case "CONNECTION_STATUS":
                    handleConnectionStatus(session, wsMessage);
                    break;
                    
                case "START_RECONCILIATION":
                    handleStartReconciliation(session, wsMessage);
                    break;
                    
                default:
                    log.warn("⚠️ Type de message inconnu: {}", wsMessage.getType());
            }
            
        } catch (Exception e) {
            log.error("❌ Erreur lors du traitement du message", e);
            
            // Envoyer un message d'erreur
            WebSocketMessage errorMessage = new WebSocketMessage();
            errorMessage.setType("ERROR");
            errorMessage.setPayload(Map.of("error", "Erreur lors du traitement du message: " + e.getMessage()));
            errorMessage.setTimestamp(System.currentTimeMillis());
            
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMessage)));
        }
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String sessionId = session.getId();
        sessions.remove(sessionId);
        log.info("❌ Connexion WebSocket fermée: {} - Status: {}", sessionId, status);
    }
    
    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("❌ Erreur de transport WebSocket pour la session: {}", session.getId(), exception);
    }
    
    private void handleConnectionStatus(WebSocketSession session, WebSocketMessage message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) message.getPayload();
            String status = (String) payload.get("status");
            String clientId = (String) payload.get("clientId");
            
            log.info("📡 Statut de connexion: {} - Client: {}", status, clientId);
            
            // Envoyer une confirmation
            WebSocketMessage response = new WebSocketMessage();
            response.setType("CONNECTION_STATUS");
            response.setPayload(Map.of("status", "confirmed", "clientId", clientId));
            response.setTimestamp(System.currentTimeMillis());
            
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
            
        } catch (Exception e) {
            log.error("❌ Erreur lors du traitement du statut de connexion", e);
        }
    }
    
    private void handleStartReconciliation(WebSocketSession session, WebSocketMessage message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) message.getPayload();
            String jobId = (String) payload.get("jobId");
            String clientId = (String) payload.get("clientId");
            
            log.info("🚀 Démarrage de réconciliation - Job: {} - Client: {}", jobId, clientId);
            
            // Démarrer la réconciliation en arrière-plan
            startReconciliationAsync(session, jobId, clientId);
            
        } catch (Exception e) {
            log.error("❌ Erreur lors du démarrage de la réconciliation", e);
        }
    }
    
    private void startReconciliationAsync(WebSocketSession session, String jobId, String clientId) {
        new Thread(() -> {
            try {
                simulateReconciliation(session, jobId, clientId);
            } catch (Exception e) {
                log.error("❌ Erreur lors de la réconciliation asynchrone", e);
                sendErrorMessage(session, "Erreur lors du traitement: " + e.getMessage());
            }
        }).start();
    }
    
    private void simulateReconciliation(WebSocketSession session, String jobId, String clientId) {
        try {
            String[] steps = {
                "Lecture des fichiers...",
                "Analyse des données...",
                "Normalisation des clés...",
                "Correspondance des enregistrements...",
                "Calcul des différences...",
                "Génération du rapport..."
            };
            
            int totalSteps = steps.length;
            for (int i = 0; i < totalSteps; i++) {
                Thread.sleep(2000);
                
                int percentage = ((i + 1) * 100) / totalSteps;
                
                // Créer la mise à jour de progression
                WebSocketMessage progressMessage = new WebSocketMessage();
                progressMessage.setType("PROGRESS_UPDATE");
                progressMessage.setPayload(Map.of(
                    "percentage", percentage,
                    "processed", (i + 1) * 1000,
                    "total", totalSteps * 1000,
                    "step", steps[i],
                    "currentFile", 1,
                    "totalFiles", 2,
                    "estimatedTimeRemaining", (totalSteps - i - 1) * 2000
                ));
                progressMessage.setTimestamp(System.currentTimeMillis());
                
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(progressMessage)));
            }
            
            // Envoyer le résultat final
            WebSocketMessage completeMessage = new WebSocketMessage();
            completeMessage.setType("RECONCILIATION_COMPLETE");
            
            java.util.Map<String, Object> resultPayload = new java.util.HashMap<>();
            resultPayload.put("matches", java.util.List.of());
            resultPayload.put("boOnly", java.util.List.of());
            resultPayload.put("partnerOnly", java.util.List.of());
            resultPayload.put("mismatches", java.util.List.of());
            resultPayload.put("totalBoRecords", 1000);
            resultPayload.put("totalPartnerRecords", 1000);
            resultPayload.put("totalMatches", 800);
            resultPayload.put("totalMismatches", 200);
            resultPayload.put("totalBoOnly", 100);
            resultPayload.put("totalPartnerOnly", 100);
            resultPayload.put("executionTimeMs", 12000L);
            resultPayload.put("processedRecords", 2000);
            resultPayload.put("progressPercentage", 100.0);
            
            completeMessage.setPayload(resultPayload);
            completeMessage.setTimestamp(System.currentTimeMillis());
            
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(completeMessage)));
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            sendErrorMessage(session, "Réconciliation interrompue");
        } catch (Exception e) {
            log.error("❌ Erreur lors de la simulation de réconciliation", e);
            sendErrorMessage(session, "Erreur lors de la réconciliation: " + e.getMessage());
        }
    }
    
    private void sendErrorMessage(WebSocketSession session, String errorMessage) {
        try {
            WebSocketMessage errorMsg = new WebSocketMessage();
            errorMsg.setType("RECONCILIATION_ERROR");
            errorMsg.setPayload(Map.of("error", errorMessage));
            errorMsg.setTimestamp(System.currentTimeMillis());
            
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorMsg)));
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi du message d'erreur", e);
        }
    }
}
