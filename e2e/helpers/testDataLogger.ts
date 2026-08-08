import fs from 'fs';
import path from 'path';

export interface TestDataEntry {
  stt: number;
  flowName: string;
  dataType: string;
  orderCodeWeb: string;
  kiotvietCodeOrId: string;
  voucherUsed: string;
  timestamp: string;
  notes: string;
}

const LOG_FILE_PATH = path.join(process.cwd(), 'e2e-test-data-log.json');

export function initTestDataLog() {
  const initialData: TestDataEntry[] = [];
  fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
}

export function logTestData(entry: Omit<TestDataEntry, 'stt' | 'timestamp'>) {
  let list: TestDataEntry[] = [];
  if (fs.existsSync(LOG_FILE_PATH)) {
    try {
      const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      list = JSON.parse(content);
    } catch (e) {
      list = [];
    }
  }

  const newEntry: TestDataEntry = {
    stt: list.length + 1,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  list.push(newEntry);
  fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  console.log(`📝 [TEST DATA LOGGED] #${newEntry.stt} | ${newEntry.flowName} | Web Code: ${newEntry.orderCodeWeb} | KiotViet: ${newEntry.kiotvietCodeOrId}`);
}

export function getTestDataLog(): TestDataEntry[] {
  if (fs.existsSync(LOG_FILE_PATH)) {
    try {
      const content = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }
  return [];
}
