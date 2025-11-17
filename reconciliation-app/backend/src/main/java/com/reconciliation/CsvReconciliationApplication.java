package com.reconciliation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CsvReconciliationApplication {
    public static void main(String[] args) {
        SpringApplication.run(CsvReconciliationApplication.class, args);
    }
} 