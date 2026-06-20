package com.reconciliation.json;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Accepte les dates envoyées par le frontend (yyyy-MM-dd, yyyy-MM-ddTHH:mm:ss, ISO avec Z).
 */
public class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    private static final DateTimeFormatter ISO_DATE_TIME = DateTimeFormatter.ISO_DATE_TIME;

    @Override
    public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        String raw = parser.getValueAsString();
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String value = raw.trim()
                .replace(" ", "T")
                .replaceAll("Z$", "")
                .replaceAll("\\.\\d+$", "");

        if (value.length() == 10) {
            return LocalDate.parse(value).atStartOfDay();
        }

        try {
            return LocalDateTime.parse(value, ISO_DATE_TIME);
        } catch (DateTimeParseException ex) {
            throw new IOException("Format de date invalide: " + raw, ex);
        }
    }
}
