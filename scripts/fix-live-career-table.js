const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = 'index.html';
const beforeSha = 'd57c24a150c2911985fff34897ff813c24c3b24f';
const afterSha = 'ff5232ecbb53070565c22ab65ff100ac903a70d2';
const sha = () => execFileSync('git', ['hash-object', path], {encoding:'utf8'}).trim();
if (sha() === afterSha) process.exit(0);
if (sha() !== beforeSha) throw new Error('Unexpected homepage version; refusing to overwrite it.');
let page = fs.readFileSync(path, 'utf8');
const tick = String.fromCharCode(96);
function once(a,b){if(page.split(a).length!==2)throw new Error('Homepage section not unique');page=page.replace(a,b)}
once('<th class="sortable" data-type="number" scope="col">Points For</th>\n<th class="sortable" data-type="number" scope="col">PPG</th>',
     '<th class="sortable" data-type="number" scope="col">Points For</th>\n<th class="sortable" data-type="number" scope="col">Points Against</th>\n<th class="sortable" data-type="number" scope="col">PPG</th>');
const renderer=[
  "  document.getElementById('frVP2').textContent = f.victory_points;",
  '  // Franchise Records and All-Time Records must use the same updated data.',
  '  renderAllTimeCareerTable();',
  '}',
  '',
  'function renderAllTimeCareerTable(){',
  '  const owners=new Map(franchiseData.map(f=>[f.owner,f]));',
  "  document.querySelectorAll('.career-table tbody tr').forEach(row=>{",
  '    const f=owners.get(row.cells[0]?.textContent.trim());',
  '    if(!f || row.cells.length<7) return;',
  '    row.cells[2].textContent='+tick+'${f.wins}-${f.losses}'+tick+';',
  '    row.cells[3].textContent=f.win_pct;',
  '    row.cells[5].textContent=f.points_for;',
  '    if(row.cells.length===11) row.insertCell(6);',
  '    row.cells[6].textContent=f.points_against;',
  '    row.cells[7].textContent=f.avg_ppg;',
  '  });',
  '}'
].join('\n');
once("  document.getElementById('frVP2').textContent = f.victory_points;\n}",renderer);
const oldTable=[
  '    const table=document.querySelector("#career-records .career-table");',
  '    if(table){',
  '      [...table.tBodies[0].rows].forEach(row=>{',
  '        const owner=row.cells[0]?.textContent.trim();',
  '        const f=byOwner.get(owner);',
  '        if(!f || row.cells.length<7) return;',
  '        row.cells[2].textContent='+tick+'${f.wins}-${f.losses}'+tick+';',
  '        row.cells[3].textContent=f.win_pct;',
  '        row.cells[5].textContent=f.points_for;',
  '        row.cells[6].textContent=f.avg_ppg;',
  '      });',
  '    }'
].join('\n');
once(oldTable,'    renderAllTimeCareerTable();');
if(page.length!==2713161)throw new Error('Unexpected generated length '+page.length+'; refusing to write');
fs.writeFileSync(path,page);
if(sha()!==afterSha)throw new Error('Generated homepage differs from verified local fix');
