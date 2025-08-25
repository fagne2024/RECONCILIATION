package com.reconciliation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    
    @JsonProperty("type")
    private String type;
    
    @JsonProperty("payload")
    private Object payload;
    
    @JsonProperty("timestamp")
    private Long timestamp;
    
    public enum MessageType {
        PROGRESS_UPDATE,
        RECONCILIATION_COMPLETE,
        RECONCILIATION_ERROR,
        CONNECTION_STATUS
    }
}
