package com.reconciliation.service;

import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.entity.ProcessingStep;
import com.reconciliation.repository.AutoProcessingModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AutoProcessingService {

    @Autowired
    private AutoProcessingModelRepository autoProcessingModelRepository;

    public List<AutoProcessingModel> getAllModels() {
        return autoProcessingModelRepository.findAll();
    }

    public AutoProcessingModel getModelById(String id) {
        Optional<AutoProcessingModel> model = autoProcessingModelRepository.findByModelId(id);
        return model.orElse(null);
    }

    public AutoProcessingModel createModel(AutoProcessingModel model) {
        if (model.getModelId() == null || model.getModelId().isEmpty()) {
            model.setModelId("model_" + UUID.randomUUID().toString());
        }
        model.setCreatedAt(LocalDateTime.now());
        model.setUpdatedAt(LocalDateTime.now());
        
        // Gérer les ProcessingStep
        if (model.getProcessingSteps() != null) {
            for (ProcessingStep step : model.getProcessingSteps()) {
                if (step.getStepId() == null || step.getStepId().isEmpty()) {
                    step.setStepId("step_" + UUID.randomUUID().toString());
                }
                step.setModel(model);
                step.setCreatedAt(LocalDateTime.now());
                step.setUpdatedAt(LocalDateTime.now());
            }
        }
        
        return autoProcessingModelRepository.save(model);
    }

    public AutoProcessingModel updateModel(String id, AutoProcessingModel model) {
        Optional<AutoProcessingModel> existingModel = autoProcessingModelRepository.findByModelId(id);
        if (existingModel.isPresent()) {
            AutoProcessingModel existing = existingModel.get();
            existing.setName(model.getName());
            existing.setFilePattern(model.getFilePattern());
            existing.setFileType(model.getFileType());
            existing.setAutoApply(model.isAutoApply());
            existing.setTemplateFile(model.getTemplateFile());
            existing.setReconciliationKeys(model.getReconciliationKeys());
            existing.setUpdatedAt(LocalDateTime.now());
            
            // Gérer les ProcessingStep
            if (model.getProcessingSteps() != null) {
                // Supprimer les anciennes étapes
                if (existing.getProcessingSteps() != null) {
                    existing.getProcessingSteps().clear();
                }
                
                // Ajouter les nouvelles étapes
                for (ProcessingStep step : model.getProcessingSteps()) {
                    if (step.getStepId() == null || step.getStepId().isEmpty()) {
                        step.setStepId("step_" + UUID.randomUUID().toString());
                    }
                    step.setModel(existing);
                    step.setCreatedAt(LocalDateTime.now());
                    step.setUpdatedAt(LocalDateTime.now());
                    existing.getProcessingSteps().add(step);
                }
            }
            
            return autoProcessingModelRepository.save(existing);
        }
        return null;
    }

    public AutoProcessingModel updateModelById(Long id, AutoProcessingModel model) {
        Optional<AutoProcessingModel> existingModel = autoProcessingModelRepository.findById(id);
        if (existingModel.isPresent()) {
            AutoProcessingModel existing = existingModel.get();
            existing.setName(model.getName());
            existing.setFilePattern(model.getFilePattern());
            existing.setFileType(model.getFileType());
            existing.setAutoApply(model.isAutoApply());
            existing.setTemplateFile(model.getTemplateFile());
            existing.setReconciliationKeys(model.getReconciliationKeys());
            existing.setUpdatedAt(LocalDateTime.now());
            
            // Gérer les ProcessingStep
            if (model.getProcessingSteps() != null) {
                // Supprimer les anciennes étapes
                if (existing.getProcessingSteps() != null) {
                    existing.getProcessingSteps().clear();
                }
                
                // Ajouter les nouvelles étapes
                for (ProcessingStep step : model.getProcessingSteps()) {
                    if (step.getStepId() == null || step.getStepId().isEmpty()) {
                        step.setStepId("step_" + UUID.randomUUID().toString());
                    }
                    step.setModel(existing);
                    step.setCreatedAt(LocalDateTime.now());
                    step.setUpdatedAt(LocalDateTime.now());
                    existing.getProcessingSteps().add(step);
                }
            }
            
            return autoProcessingModelRepository.save(existing);
        }
        return null;
    }

    public boolean deleteModel(String id) {
        // Essayer d'abord avec l'ID tel quel (modelId)
        Optional<AutoProcessingModel> model = autoProcessingModelRepository.findByModelId(id);
        
        // Si pas trouvé, essayer avec l'ID numérique
        if (!model.isPresent()) {
            try {
                Long numericId = Long.parseLong(id);
                model = autoProcessingModelRepository.findById(numericId);
            } catch (NumberFormatException e) {
                // L'ID n'est pas numérique, on garde le résultat null
            }
        }
        
        if (model.isPresent()) {
            autoProcessingModelRepository.delete(model.get());
            return true;
        }
        return false;
    }
} 