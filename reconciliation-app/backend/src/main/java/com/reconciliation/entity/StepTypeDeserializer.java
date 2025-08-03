package com.reconciliation.entity;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

public class StepTypeDeserializer extends JsonDeserializer<ProcessingStep.StepType> {
    
    @Override
    public ProcessingStep.StepType deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getValueAsString();
        if (value == null) {
            return null;
        }
        return ProcessingStep.StepType.fromString(value);
    }
} 