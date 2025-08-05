let originalData = [];
let lastData = [];

// === File Upload ===
document.getElementById('submitBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('upload');
  if (!fileInput.files[0]) {
    alert("Please choose a file first.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    originalData = sheet;

    drawChart(originalData); // This calls your Balkan chart logic

    lastData = originalData;

    // Show chart UI and hide upload UI
    document.getElementById('chart_div').style.display = 'block';
    document.getElementById('search').style.display = 'inline-block';
    document.getElementById('refreshBtn').style.display = 'inline-block';
    document.getElementById('backBtn').style.display = 'inline-block';
    document.getElementById('printBtn').style.display = 'inline-block';

    document.getElementById('file-controls').style.display = 'none';
    document.getElementById('page-title').style.display = 'none';
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('logo-image').style.display = 'none';
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
});


document.getElementById('clearBtn').addEventListener('click', () => {
  location.reload();
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  document.getElementById('search').value = '';
  drawChart(originalData);
  lastData = originalData;
});

document.getElementById('backBtn').addEventListener('click', () => {
  document.getElementById('chart_div').style.display = 'none';
  document.getElementById('search').style.display = 'none';
  document.getElementById('refreshBtn').style.display = 'none';
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('printBtn').style.display = 'none';

  document.getElementById('file-controls').style.display = 'flex';
  document.getElementById('page-title').style.display = 'block';
  document.getElementById('instructions').style.display = 'block';
  document.getElementById('logo-image').style.display = 'block';

  document.getElementById('upload').value = '';
  document.getElementById('search').value = '';
});

// === Search ===
document.getElementById('search').addEventListener('input', function () {
  const query = this.value.trim().toLowerCase();
  if (query === '') {
    drawChart(originalData);
    lastData = originalData;
    return;
  }

  const matched = originalData.find(row => row.First_Name.toLowerCase().includes(query));
  if (!matched) {
    drawChart([]);
    lastData = [];
    return;
  }

  const subtree = [];
  function addSubtree(currentId) {
    originalData.forEach(row => {
      if (row["Parent ID"] === currentId) {
        subtree.push(row);
        addSubtree(row.ID);
      }
    });
  }

  subtree.push(matched);
  addSubtree(matched.ID);

  drawChart(subtree);
  lastData = subtree;
});

// === Draw Org Chart ===
function drawChart(data) {
  const nodes = data.map(row => ({
    id: row.ID,
    pid: row["Parent ID"] || null,
    name: row.First_Name,
    title: row.Designation
  }));

  // Node style: white fill, black border
  OrgChart.templates.ana.node =
    '<rect x="0" y="0" height="{h}" width="{w}" rx="10" ry="10" fill="#fff" stroke="#000" stroke-width="1.5"></rect>';

  OrgChart.templates.ana.size = [250, 140];

  // Plus icon (expand)
  OrgChart.templates.ana.plus =
    '<circle cx="15" cy="15" r="10" fill="orange" stroke="#000" stroke-width="1"></circle>' +
    '<line x1="10" y1="15" x2="20" y2="15" stroke="#000" stroke-width="2"></line>' +
    '<line x1="15" y1="10" x2="15" y2="20" stroke="#000" stroke-width="2"></line>';

  // Minus icon (collapse)
  OrgChart.templates.ana.minus =
    '<circle cx="15" cy="15" r="10" fill="orange" stroke="#000" stroke-width="1"></circle>' +
    '<line x1="10" y1="15" x2="20" y2="15" stroke="#000" stroke-width="2"></line>';

  OrgChart.templates.ana.field_0 = 
    '<foreignObject x="5" y="15" width="240" height="55">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 28px; font-weight: bold; text-align:center; line-height: 1.1;">{val}</div>' +
    '</foreignObject>';

  OrgChart.templates.ana.field_1 = 
    '<foreignObject x="5" y="75" width="240" height="55">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 24px; color: #444; text-align:center; line-height: 1.1;">{val}</div>' +
    '</foreignObject>';

  const chart = new OrgChart(document.getElementById("orgChart"), {
    nodes: nodes,
    nodeBinding: {
      field_0: "name",
      field_1: "title"
    },
    scaleInitial: OrgChart.match.boundary,
    layout: OrgChart.mixed,
    enableSearch: false,
    template: "ana", // or 'ana', 'isla', etc.
    spacing: 20,            // Reduce vertical space
    levelSeparation: 80,
    nodeMouseClick: OrgChart.action.none,
  });

  // Popup binding
  chart.on("click", function(sender, args){
    const empId = args.node.id;
    const emp = data.find(r => r.ID.toString() === empId.toString());
    const manager = data.find(r => r.ID === emp["Parent ID"]);

    document.getElementById('emp-id').textContent = emp.ID;
    document.getElementById('emp-name').textContent = emp.First_Name;
    document.getElementById('emp-designation').textContent = emp.Designation;
    document.getElementById('emp-under').textContent = manager ? manager.First_Name : 'None';

    document.getElementById('popup').classList.remove('hidden');
  });
}


document.getElementById('close-popup').addEventListener('click', () => {
  document.getElementById('popup').classList.add('hidden');
});

// === Print with header + safe margins (fixed right cut) ===
document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});


// ✅ Reset main window state after printing
window.onafterprint = function () {
  document.getElementById('search').value = '';
  drawChart(originalData);
  lastData = originalData;
};