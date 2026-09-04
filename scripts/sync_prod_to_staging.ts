import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://jigvdopvzozyauwsxetn.supabase.co';
const PROD_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppZ3Zkb3B2em96eWF1d3N4ZXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzE4NjEsImV4cCI6MjEwNDEwNzg2MX0.jcuPuMKGrG-Xdlv5u096XGwI0DvqBccQHq4Qo0yJZmg';

const STAGING_URL = 'https://sxeuswrawrzsxiqczzgx.supabase.co';
const STAGING_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZXVzd3Jhd3J6c3hpcWN6emd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzQyMjYsImV4cCI6MjEwNDExMDIyNn0.kPHN8l6yJjktWWY3YVKN8sBYggLgexmd3AY4w_zJLck';

const prod = createClient(PROD_URL, PROD_KEY);
const staging = createClient(STAGING_URL, STAGING_KEY);

async function fetchAllProdRows(table: string): Promise<any[]> {
  const pageSize = 1000;
  let all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await prod.from(table).select('*').range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function cloneTable(table: string) {
  console.log(`⏳ Đang sao chép bảng ${table} từ Production sang Staging...`);
  const rows = await fetchAllProdRows(table);
  console.log(`  -> Đã đọc ${rows.length} bản ghi từ Prod.`);
  if (rows.length === 0) return;

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await staging.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Lỗi khi nạp vào ${table} trên Staging:`, error.message);
      return;
    }
  }
  console.log(`  ✅ Hoàn tất đồng bộ ${rows.length} bản ghi của bảng ${table} sang Staging!`);
}

async function main() {
  console.log('====================================================');
  console.log('🚀 CLONE DỮ LIỆU TỪ PRODUCTION SANG STAGING SUPABASE');
  console.log('====================================================\n');

  // Test connection to staging
  const testRes = await staging.from('products').select('id').limit(1);
  if (testRes.error && testRes.error.code === 'PGRST205') {
    console.error('❌ LỖI: Dự án Staging chưa được khởi tạo bảng (Schema)!');
    console.error('Vui lòng mở Supabase Dashboard Staging -> SQL Editor và chạy tệp supabase/schema.sql trước:');
    console.error('👉 https://supabase.com/dashboard/project/sxeuswrawrzsxiqczzgx/sql/new\n');
    process.exit(1);
  }

  const tables = [
    'store_settings',
    'branches',
    'app_users',
    'categories',
    'products',
    'customers',
    'suppliers',
    'orders',
    'cashbook',
    'inventory_audits',
  ];

  for (const table of tables) {
    await cloneTable(table);
  }

  console.log('\n🎉 XONG! DỰ ÁN STAGING ĐÃ CÓ TOÀN BỘ DỮ LIỆU TỪ PRODUCTION!');
}

main().catch(console.error);
