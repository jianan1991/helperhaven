package com.helperhaven.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Persists String[] as a comma-separated VARCHAR — works on H2 and Postgres alike. */
@Converter
public class StringArrayConverter implements AttributeConverter<String[], String> {

    @Override
    public String convertToDatabaseColumn(String[] array) {
        if (array == null || array.length == 0) return null;
        return String.join(",", array);
    }

    @Override
    public String[] convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return new String[0];
        return dbData.split(",", -1);
    }
}
