import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;

public class AnalyzeTRXBO {
    public static void main(String[] args) {
        String filePath = "reconciliation-app/watch-folder/TRXBO.xls";
        File file = new File(filePath);
        
        if (!file.exists()) {
            System.out.println("❌ Fichier non trouvé: " + filePath);
            return;
        }
        
        System.out.println("🔍 Analyse du fichier TRXBO.xls...");
        System.out.println("📁 Chemin: " + file.getAbsolutePath());
        System.out.println("📏 Taille: " + file.length() + " bytes");
        
        try {
            FileInputStream fis = new FileInputStream(file);
            Workbook workbook = new HSSFWorkbook(fis);
            Sheet sheet = workbook.getSheetAt(0);
            
            System.out.println("📋 Nombre de feuilles: " + workbook.getNumberOfSheets());
            System.out.println("📄 Nombre de lignes dans la première feuille: " + sheet.getLastRowNum());
            
            // Analyser les premières 10 lignes
            System.out.println("\n📊 Contenu des premières 10 lignes:");
            System.out.println("=" * 80);
            
            for (int i = 0; i <= Math.min(10, sheet.getLastRowNum()); i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    List<String> rowData = new ArrayList<>();
                    for (int j = 0; j < row.getLastCellNum(); j++) {
                        Cell cell = row.getCell(j);
                        String cellValue = (cell != null) ? cell.toString().trim() : "";
                        rowData.add(cellValue);
                    }
                    
                    if (!rowData.isEmpty()) {
                        System.out.println("Ligne " + i + ": " + String.join(" | ", rowData));
                        System.out.println("Nombre de colonnes: " + rowData.size());
                        System.out.println("-".repeat(40));
                    }
                }
            }
            
            workbook.close();
            fis.close();
            
            System.out.println("\n✅ Analyse terminée");
            
        } catch (IOException e) {
            System.err.println("❌ Erreur lors de l'analyse: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
