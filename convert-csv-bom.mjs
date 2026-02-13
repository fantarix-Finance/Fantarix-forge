// Script to convert CSV to UTF-8 with BOM for Excel compatibility
import { promises as fs } from 'fs';

const csvPath = './public/portfolio-template.csv';

async function convertToUTF8BOM() {
    try {
        // Read the file
        const content = await fs.readFile(csvPath, 'utf8');

        // Add BOM (Byte Order Mark) for UTF-8
        const BOM = '\uFEFF';
        const contentWithBOM = BOM + content;

        // Write back with BOM
        await fs.writeFile(csvPath, contentWithBOM, 'utf8');

        console.log('✅ CSV 파일을 UTF-8 BOM으로 변환 완료');
        console.log('   엑셀에서 열어보세요!');
    } catch (error) {
        console.error('❌ 오류 발생:', error);
    }
}

convertToUTF8BOM();
