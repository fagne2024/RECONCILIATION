package com.reconciliation.service;

import com.reconciliation.entity.CompteEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.model.Operation;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.dto.OperationCreateRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
public class OperationServiceTest {

    @Mock
    private OperationRepository operationRepository;

    @Mock
    private CompteRepository compteRepository;

    @Mock
    private FraisTransactionService fraisTransactionService;

    @Mock
    private AgencySummaryRepository agencySummaryRepository;

    @InjectMocks
    private OperationService operationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // Mock pour éviter l'appel à createFraisTransactionAutomatique
        when(fraisTransactionService.getFraisApplicable(any(), any())).thenReturn(Optional.empty());
    }

    @Test
    void testGenerateCompenseReference() {
        // Arrange
        String codeProprietaire = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte = new CompteEntity();
        compte.setId(1L);
        compte.setNumeroCompte(codeProprietaire);
        compte.setSolde(1000.0);
        compte.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte));
        when(operationRepository.countCompenseOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(1L);
            }
            return entity;
        });

        OperationCreateRequest request = new OperationCreateRequest();
        request.setCompteId(1L);
        request.setTypeOperation("compense");
        request.setMontant(100.0);
        request.setBanque("Test Bank");
        request.setService("Test Service");

        // Act
        Operation result = operationService.createOperation(request);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getReference());
        assertTrue(result.getReference().startsWith(codeProprietaire + "-"));
        assertTrue(result.getReference().contains("CP1"));
        assertEquals("compense", result.getTypeOperation());
    }

    @Test
    void testGenerateCompenseReferenceSecondOperation() {
        // Arrange
        String codeProprietaire = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte = new CompteEntity();
        compte.setId(1L);
        compte.setNumeroCompte(codeProprietaire);
        compte.setSolde(1000.0);
        compte.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte));
        when(operationRepository.countCompenseOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(1L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(2L);
            }
            return entity;
        });

        OperationCreateRequest request = new OperationCreateRequest();
        request.setCompteId(1L);
        request.setTypeOperation("compense");
        request.setMontant(100.0);
        request.setBanque("Test Bank");
        request.setService("Test Service");

        // Act
        Operation result = operationService.createOperation(request);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getReference());
        assertTrue(result.getReference().startsWith(codeProprietaire + "-"));
        assertTrue(result.getReference().contains("CP2"));
        assertEquals("compense", result.getTypeOperation());
    }

    @Test
    void testGenerateCompenseReferenceDifferentProprietaires() {
        // Arrange - Premier propriétaire
        String codeProprietaire1 = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte1 = new CompteEntity();
        compte1.setId(1L);
        compte1.setNumeroCompte(codeProprietaire1);
        compte1.setSolde(1000.0);
        compte1.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte1));
        when(operationRepository.countCompenseOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(1L);
            }
            return entity;
        });

        OperationCreateRequest request1 = new OperationCreateRequest();
        request1.setCompteId(1L);
        request1.setTypeOperation("compense");
        request1.setMontant(100.0);
        request1.setBanque("Test Bank");
        request1.setService("Test Service");

        // Act - Première compense pour CELCM001
        Operation result1 = operationService.createOperation(request1);

        // Arrange - Deuxième propriétaire
        String codeProprietaire2 = "CELCM002";
        
        CompteEntity compte2 = new CompteEntity();
        compte2.setId(2L);
        compte2.setNumeroCompte(codeProprietaire2);
        compte2.setSolde(2000.0);
        compte2.setPays("Sénégal");
        
        when(compteRepository.findById(2L)).thenReturn(Optional.of(compte2));
        when(operationRepository.countCompenseOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(2L);
            }
            return entity;
        });

        OperationCreateRequest request2 = new OperationCreateRequest();
        request2.setCompteId(2L);
        request2.setTypeOperation("compense");
        request2.setMontant(200.0);
        request2.setBanque("Test Bank");
        request2.setService("Test Service");

        // Act - Première compense pour CELCM002
        Operation result2 = operationService.createOperation(request2);

        // Assert
        assertNotNull(result1);
        assertNotNull(result1.getReference());
        assertTrue(result1.getReference().startsWith(codeProprietaire1 + "-"));
        assertTrue(result1.getReference().contains("CP1"));
        
        assertNotNull(result2);
        assertNotNull(result2.getReference());
        assertTrue(result2.getReference().startsWith(codeProprietaire2 + "-"));
        assertTrue(result2.getReference().contains("CP1"));
        
        // Les deux doivent avoir CP1 car c'est la première compense de chaque propriétaire
        assertEquals("compense", result1.getTypeOperation());
        assertEquals("compense", result2.getTypeOperation());
    }

    @Test
    void testGenerateApprovisionnementReference() {
        // Arrange
        String codeProprietaire = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte = new CompteEntity();
        compte.setId(1L);
        compte.setNumeroCompte(codeProprietaire);
        compte.setSolde(1000.0);
        compte.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte));
        when(operationRepository.countApprovisionnementOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(1L);
            }
            return entity;
        });

        OperationCreateRequest request = new OperationCreateRequest();
        request.setCompteId(1L);
        request.setTypeOperation("approvisionnement");
        request.setMontant(100.0);
        request.setBanque("Test Bank");
        request.setService("Test Service");

        // Act
        Operation result = operationService.createOperation(request);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getReference());
        assertTrue(result.getReference().startsWith(codeProprietaire + "-"));
        assertTrue(result.getReference().contains("AP1"));
        assertEquals("approvisionnement", result.getTypeOperation());
    }

    @Test
    void testGenerateApprovisionnementReferenceSecondOperation() {
        // Arrange
        String codeProprietaire = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte = new CompteEntity();
        compte.setId(1L);
        compte.setNumeroCompte(codeProprietaire);
        compte.setSolde(1000.0);
        compte.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte));
        when(operationRepository.countApprovisionnementOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(1L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(2L);
            }
            return entity;
        });

        OperationCreateRequest request = new OperationCreateRequest();
        request.setCompteId(1L);
        request.setTypeOperation("approvisionnement");
        request.setMontant(100.0);
        request.setBanque("Test Bank");
        request.setService("Test Service");

        // Act
        Operation result = operationService.createOperation(request);

        // Assert
        assertNotNull(result);
        assertNotNull(result.getReference());
        assertTrue(result.getReference().startsWith(codeProprietaire + "-"));
        assertTrue(result.getReference().contains("AP2"));
        assertEquals("approvisionnement", result.getTypeOperation());
    }

    @Test
    void testGenerateApprovisionnementReferenceDifferentProprietaires() {
        // Arrange - Premier propriétaire
        String codeProprietaire1 = "CELCM001";
        LocalDateTime dateOperation = LocalDateTime.of(2025, 7, 31, 10, 30);
        
        CompteEntity compte1 = new CompteEntity();
        compte1.setId(1L);
        compte1.setNumeroCompte(codeProprietaire1);
        compte1.setSolde(1000.0);
        compte1.setPays("Sénégal");
        
        when(compteRepository.findById(1L)).thenReturn(Optional.of(compte1));
        when(operationRepository.countApprovisionnementOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(1L);
            }
            return entity;
        });

        OperationCreateRequest request1 = new OperationCreateRequest();
        request1.setCompteId(1L);
        request1.setTypeOperation("approvisionnement");
        request1.setMontant(100.0);
        request1.setBanque("Test Bank");
        request1.setService("Test Service");

        // Act - Premier approvisionnement pour CELCM001
        Operation result1 = operationService.createOperation(request1);

        // Arrange - Deuxième propriétaire
        String codeProprietaire2 = "CELCM002";
        
        CompteEntity compte2 = new CompteEntity();
        compte2.setId(2L);
        compte2.setNumeroCompte(codeProprietaire2);
        compte2.setSolde(2000.0);
        compte2.setPays("Sénégal");
        
        when(compteRepository.findById(2L)).thenReturn(Optional.of(compte2));
        when(operationRepository.countApprovisionnementOperationsByCodeProprietaireAndDate(any(), any())).thenReturn(0L);
        when(operationRepository.save(any())).thenAnswer(invocation -> {
            OperationEntity entity = invocation.getArgument(0);
            if (entity != null) {
                entity.setId(2L);
            }
            return entity;
        });

        OperationCreateRequest request2 = new OperationCreateRequest();
        request2.setCompteId(2L);
        request2.setTypeOperation("approvisionnement");
        request2.setMontant(200.0);
        request2.setBanque("Test Bank");
        request2.setService("Test Service");

        // Act - Premier approvisionnement pour CELCM002
        Operation result2 = operationService.createOperation(request2);

        // Assert
        assertNotNull(result1);
        assertNotNull(result1.getReference());
        assertTrue(result1.getReference().startsWith(codeProprietaire1 + "-"));
        assertTrue(result1.getReference().contains("AP1"));
        
        assertNotNull(result2);
        assertNotNull(result2.getReference());
        assertTrue(result2.getReference().startsWith(codeProprietaire2 + "-"));
        assertTrue(result2.getReference().contains("AP1"));
        
        // Les deux doivent avoir AP1 car c'est le premier approvisionnement de chaque propriétaire
        assertEquals("approvisionnement", result1.getTypeOperation());
        assertEquals("approvisionnement", result2.getTypeOperation());
    }
} 