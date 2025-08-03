package com.reconciliation.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonValue;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

@Entity
@Table(name = "auto_processing_models")
public class AutoProcessingModel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true)
    private String modelId;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "file_pattern")
    private String filePattern;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "file_type")
    @JsonDeserialize(using = FileTypeDeserializer.class)
    private FileType fileType;
    
    @Column(name = "auto_apply")
    private boolean autoApply;
    
    @Column(name = "template_file")
    private String templateFile;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "model", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProcessingStep> processingSteps;
    
    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> reconciliationKeys;
    
    public enum FileType {
        BO("bo"),
        PARTNER("partner"),
        BOTH("both");
        
        private final String value;
        
        FileType(String value) {
            this.value = value;
        }
        
        @JsonValue
        public String getValue() {
            return value;
        }
        
        public static FileType fromString(String text) {
            for (FileType type : FileType.values()) {
                if (type.value.equalsIgnoreCase(text)) {
                    return type;
                }
            }
            throw new IllegalArgumentException("Valeur invalide pour FileType: " + text);
        }
    }
    
    // Constructeurs
    public AutoProcessingModel() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters et Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getModelId() {
        return modelId;
    }
    
    public void setModelId(String modelId) {
        this.modelId = modelId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getFilePattern() {
        return filePattern;
    }
    
    public void setFilePattern(String filePattern) {
        this.filePattern = filePattern;
    }
    
    public FileType getFileType() {
        return fileType;
    }
    
    public void setFileType(FileType fileType) {
        this.fileType = fileType;
    }
    
    public boolean isAutoApply() {
        return autoApply;
    }
    
    public void setAutoApply(boolean autoApply) {
        this.autoApply = autoApply;
    }
    
    public String getTemplateFile() {
        return templateFile;
    }
    
    public void setTemplateFile(String templateFile) {
        this.templateFile = templateFile;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public List<ProcessingStep> getProcessingSteps() {
        return processingSteps;
    }
    
    public void setProcessingSteps(List<ProcessingStep> processingSteps) {
        this.processingSteps = processingSteps;
    }
    
    public Map<String, Object> getReconciliationKeys() {
        return reconciliationKeys;
    }
    
    public void setReconciliationKeys(Map<String, Object> reconciliationKeys) {
        this.reconciliationKeys = reconciliationKeys;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
} 