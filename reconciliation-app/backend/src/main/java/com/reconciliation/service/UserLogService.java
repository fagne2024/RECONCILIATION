package com.reconciliation.service;

import com.reconciliation.entity.UserLogEntity;
import com.reconciliation.repository.UserLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class UserLogService {

    @Autowired
    private UserLogRepository userLogRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Enregistre un log utilisateur
     */
    @Transactional
    public UserLogEntity saveLog(String permission, String module, String username) {
        UserLogEntity log = new UserLogEntity(permission, module, username, LocalDateTime.now());
        return userLogRepository.save(log);
    }

    /**
     * Récupère tous les logs triés par date décroissante
     */
    public List<UserLogEntity> getAllLogs() {
        return userLogRepository.findAllOrderByDateHeureDesc();
    }

    /**
     * Récupère les logs d'un utilisateur
     */
    public List<UserLogEntity> getLogsByUsername(String username) {
        return userLogRepository.findByUsername(username);
    }

    /**
     * Récupère les logs d'un module
     */
    public List<UserLogEntity> getLogsByModule(String module) {
        return userLogRepository.findByModule(module);
    }

    /**
     * Récupère les logs d'une permission
     */
    public List<UserLogEntity> getLogsByPermission(String permission) {
        return userLogRepository.findByPermission(permission);
    }

    /**
     * Récupère les logs entre deux dates
     */
    public List<UserLogEntity> getLogsByDateRange(String dateDebut, String dateFin) {
        LocalDateTime dateDebutParsed = null;
        LocalDateTime dateFinParsed = null;
        
        if (dateDebut != null && !dateDebut.isEmpty()) {
            try {
                if (dateDebut.contains("T")) {
                    dateDebutParsed = LocalDateTime.parse(dateDebut.replace("T", " "));
                } else {
                    dateDebutParsed = LocalDateTime.parse(dateDebut, DATE_FORMATTER);
                }
            } catch (Exception e) {
                // Date invalide, on ignore le filtre
            }
        }
        
        if (dateFin != null && !dateFin.isEmpty()) {
            try {
                if (dateFin.contains("T")) {
                    dateFinParsed = LocalDateTime.parse(dateFin.replace("T", " "));
                } else {
                    dateFinParsed = LocalDateTime.parse(dateFin, DATE_FORMATTER);
                }
            } catch (Exception e) {
                // Date invalide, on ignore le filtre
            }
        }

        if (dateDebutParsed != null && dateFinParsed != null) {
            return userLogRepository.findByDateHeureBetween(dateDebutParsed, dateFinParsed);
        } else if (dateDebutParsed != null) {
            dateFinParsed = LocalDateTime.now();
            return userLogRepository.findByDateHeureBetween(dateDebutParsed, dateFinParsed);
        } else if (dateFinParsed != null) {
            dateDebutParsed = LocalDateTime.of(2000, 1, 1, 0, 0);
            return userLogRepository.findByDateHeureBetween(dateDebutParsed, dateFinParsed);
        }
        
        return getAllLogs();
    }

    /**
     * Récupère les logs avec filtres multiples
     */
    public List<UserLogEntity> getLogsWithFilters(String username, String module, String permission, 
                                                  String dateDebut, String dateFin) {
        List<UserLogEntity> logs;
        
        // Filtrer par date d'abord si fourni
        if (dateDebut != null && !dateDebut.isEmpty() || dateFin != null && !dateFin.isEmpty()) {
            logs = getLogsByDateRange(dateDebut, dateFin);
        } else {
            logs = getAllLogs();
        }
        
        // Filtrer par username si fourni
        if (username != null && !username.isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getUsername().equalsIgnoreCase(username))
                    .toList();
        }
        
        // Filtrer par module si fourni
        if (module != null && !module.isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getModule().equalsIgnoreCase(module))
                    .toList();
        }
        
        // Filtrer par permission si fourni
        if (permission != null && !permission.isEmpty()) {
            logs = logs.stream()
                    .filter(log -> log.getPermission().equalsIgnoreCase(permission))
                    .toList();
        }
        
        return logs;
    }
}

