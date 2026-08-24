const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1/', '');
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.replace('/rest/v1', '');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase environment variables are missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseCSV(text) {
  const records = [];
  let currentField = '';
  let inQuotes = false;
  let currentRecord = [];
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRecord.push(currentField);
      records.push(currentRecord);
      currentRecord = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }
  return records;
}

async function seed() {
  try {
    const content = fs.readFileSync('dinamicas_tareas.csv', 'utf8');
    const rows = parseCSV(content);
    
    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1).filter(r => r.length >= 6 && r[headers.indexOf('nombre')]);

    console.log(`Parsed ${dataRows.length} dynamics from CSV.`);

    // Convert rows to objects matching the table schema
    const objects = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        if (val === undefined || val === null) {
          obj[header] = null;
        } else {
          val = val.trim();
          if (val === '') {
            obj[header] = null;
          } else {
            // Try to parse JSON array for the array columns
            if (['contenidos_ofensivos', 'contenidos_defensivos', 'consignas', 'reglas', 'variantes'].includes(header)) {
              try {
                // If it is already a JSON array string
                if (val.startsWith('[') && val.endsWith(']')) {
                  obj[header] = JSON.parse(val);
                } else {
                  obj[header] = [val];
                }
              } catch (e) {
                // If parsing fails, fall back to simple array or text
                obj[header] = [val];
              }
            } else if (header === 'id') {
              obj[header] = parseInt(val, 10);
            } else {
              obj[header] = val;
            }
          }
        }
      });
      return obj;
    });

    console.log('Deleting existing tasks...');
    const { error: deleteError } = await supabase
      .from('tareas')
      .delete()
      .neq('id', 0); // deletes all rows

    if (deleteError) {
      console.warn('Warning deleting existing tasks:', deleteError);
    } else {
      console.log('Successfully cleared existing tasks.');
    }

    console.log(`Inserting ${objects.length} tasks...`);
    const { data: insertedData, error: insertError } = await supabase
      .from('tareas')
      .insert(objects)
      .select();

    if (insertError) {
      console.error('Error inserting tasks:', insertError);
      process.exit(1);
    }

    console.log(`Successfully seeded ${insertedData?.length} tasks in the "tareas" table!`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

seed();
