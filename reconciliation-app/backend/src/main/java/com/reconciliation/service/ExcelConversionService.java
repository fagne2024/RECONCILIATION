package com.reconciliation.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.util.IOUtils;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class ExcelConversionService {

    static {
        IOUtils.setByteArrayMaxOverride(512 * 1024 * 1024);
    }

    public byte[] convertXlsToXlsx(MultipartFile file) throws IOException {
        validateFile(file);

        try (InputStream inputStream = file.getInputStream();
             HSSFWorkbook sourceWorkbook = new HSSFWorkbook(inputStream);
             XSSFWorkbook targetWorkbook = new XSSFWorkbook()) {

            for (int i = 0; i < sourceWorkbook.getNumberOfSheets(); i++) {
                Sheet sourceSheet = sourceWorkbook.getSheetAt(i);
                XSSFSheet targetSheet = targetWorkbook.createSheet(sourceSheet.getSheetName());
                copySheet(sourceSheet, targetSheet, targetWorkbook);
            }

            try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                targetWorkbook.write(outputStream);
                return outputStream.toByteArray();
            }
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier fourni est vide.");
        }

        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("Nom de fichier invalide.");
        }

        if (!fileName.toLowerCase().endsWith(".xls")) {
            throw new IllegalArgumentException("Seuls les fichiers .xls (Excel 97-2003) sont acceptés pour la conversion.");
        }
    }

    private void copySheet(Sheet sourceSheet, XSSFSheet targetSheet, XSSFWorkbook targetWorkbook) {
        Map<CellStyle, CellStyle> styleCache = new HashMap<>();

        targetSheet.createFreezePane(
                sourceSheet.getPaneInformation() != null ? sourceSheet.getPaneInformation().getHorizontalSplitPosition() : 0,
                sourceSheet.getPaneInformation() != null ? sourceSheet.getPaneInformation().getVerticalSplitPosition() : 0
        );

        for (int rowIndex = sourceSheet.getFirstRowNum(); rowIndex <= sourceSheet.getLastRowNum(); rowIndex++) {
            Row sourceRow = sourceSheet.getRow(rowIndex);
            if (sourceRow == null) {
                continue;
            }

            Row targetRow = targetSheet.createRow(rowIndex);
            targetRow.setHeight(sourceRow.getHeight());

            for (int colIndex = sourceRow.getFirstCellNum(); colIndex < sourceRow.getLastCellNum(); colIndex++) {
                Cell sourceCell = sourceRow.getCell(colIndex);
                if (sourceCell == null) {
                    continue;
                }

                Cell targetCell = targetRow.createCell(colIndex);
                copyCellValue(sourceCell, targetCell);

                CellStyle sourceStyle = sourceCell.getCellStyle();
                if (sourceStyle != null) {
                    targetCell.setCellStyle(cloneCellStyle(sourceStyle, targetWorkbook, styleCache));
                }
            }
        }

        copyColumnWidths(sourceSheet, targetSheet);
        copyMergedRegions(sourceSheet, targetSheet);
    }

    private void copyCellValue(Cell sourceCell, Cell targetCell) {
        switch (sourceCell.getCellType()) {
            case STRING -> targetCell.setCellValue(sourceCell.getRichStringCellValue());
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(sourceCell)) {
                    targetCell.setCellValue(sourceCell.getDateCellValue());
                } else {
                    targetCell.setCellValue(sourceCell.getNumericCellValue());
                }
            }
            case BOOLEAN -> targetCell.setCellValue(sourceCell.getBooleanCellValue());
            case FORMULA -> targetCell.setCellFormula(sourceCell.getCellFormula());
            case ERROR -> targetCell.setCellErrorValue(sourceCell.getErrorCellValue());
            case BLANK -> targetCell.setBlank();
            default -> targetCell.setCellValue(sourceCell.toString());
        }
    }

    private CellStyle cloneCellStyle(CellStyle sourceStyle, XSSFWorkbook targetWorkbook, Map<CellStyle, CellStyle> styleCache) {
        if (styleCache.containsKey(sourceStyle)) {
            return styleCache.get(sourceStyle);
        }

        XSSFCellStyle targetStyle = targetWorkbook.createCellStyle();
        targetStyle.cloneStyleFrom(sourceStyle);
        styleCache.put(sourceStyle, targetStyle);
        return targetStyle;
    }

    private void copyColumnWidths(Sheet sourceSheet, XSSFSheet targetSheet) {
        int maxColumn = 0;
        for (Row row : sourceSheet) {
            if (row.getLastCellNum() > maxColumn) {
                maxColumn = row.getLastCellNum();
            }
        }

        for (int i = 0; i <= maxColumn; i++) {
            targetSheet.setColumnWidth(i, sourceSheet.getColumnWidth(i));
            targetSheet.setColumnHidden(i, sourceSheet.isColumnHidden(i));
        }
    }

    private void copyMergedRegions(Sheet sourceSheet, XSSFSheet targetSheet) {
        for (int i = 0; i < sourceSheet.getNumMergedRegions(); i++) {
            CellRangeAddress mergedRegion = sourceSheet.getMergedRegion(i);
            targetSheet.addMergedRegion(mergedRegion.copy());
        }
    }
}

