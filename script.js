google.charts.load('current', { packages: ["orgchart"] });

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

    drawChart(originalData);
    lastData = originalData;

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
  google.charts.setOnLoadCallback(() => {
    const chartData = new google.visualization.DataTable();
    chartData.addColumn('string', 'Name');
    chartData.addColumn('string', 'Manager');
    chartData.addColumn('string', 'ToolTip');

    data.forEach(row => {
      const nodeId = row.ID.toString();
      const managerId = row["Parent ID"] ? row["Parent ID"].toString() : '';
      const displayName = `${row.First_Name} (${row.Designation})`;

      chartData.addRow([
        { v: nodeId, f: `<div class='node-box' data-id='${row.ID}'>${displayName}</div>` },
        managerId,
        row.Designation
      ]);
    });

    const chart = new google.visualization.OrgChart(document.getElementById('chart-container'));
    chart.draw(chartData, { allowHtml: true });

    // ✅ Auto-scale chart
    // ✅ Auto-scale chart (device-independent)
    // ✅ Auto-scale chart (works across all laptops/screens)
    // ✅ Auto-scale chart with fallback scroll (cross-device safe)
    setTimeout(() => {
      const container = document.getElementById('chart-container');
      const chartDiv = document.getElementById('chart_div');

      const chartWidth = container.scrollWidth;
      const chartHeight = container.scrollHeight;

      const availableWidth = chartDiv.clientWidth - 80;   // safe margins
      const availableHeight = chartDiv.clientHeight - 160;

      let scale = Math.min(availableWidth / chartWidth, availableHeight / chartHeight);

      if (scale > 1) scale = 1; // never upscale

      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = "top center";

      // ✅ allow scroll if chart is still larger
      chartDiv.style.overflow = (scale < 1) ? "hidden" : "auto";
    }, 500);


    // Keep connection line styling
    setTimeout(() => {
      document.querySelectorAll('path').forEach(path => {
        path.setAttribute('stroke', '#0044cc');
        path.setAttribute('stroke-width', '3');
      });
    }, 100);

    // Popup binding
    document.querySelectorAll('.node-box').forEach(box => {
      box.addEventListener('click', () => {
        const empId = box.dataset.id;
        const emp = originalData.find(r => r.ID.toString() === empId);
        const manager = originalData.find(r => r.ID === emp["Parent ID"]);

        document.getElementById('emp-id').textContent = emp.ID;
        document.getElementById('emp-name').textContent = emp.First_Name;
        document.getElementById('emp-designation').textContent = emp.Designation;
        document.getElementById('emp-under').textContent = manager ? manager.First_Name : 'None';

        document.getElementById('popup').classList.remove('hidden');
      });
    });
  });
}

document.getElementById('close-popup').addEventListener('click', () => {
  document.getElementById('popup').classList.add('hidden');
});

// === Print with header + safe margins (fixed right cut) ===
document.getElementById('printBtn').addEventListener('click', () => {
  const printWindow = window.open('', '_blank');

  printWindow.document.write(`
    <html>
    <head>
      <title>Suprajith Engineering PVT LTD - Org Chart</title>
      <script src="https://www.gstatic.com/charts/loader.js"></script>
      <style>
        @page { size: A4 landscape; margin: 5mm; }
        html, body { margin:0; padding:0; overflow:visible; }
        .header {
          display:flex;
          align-items:center;
          gap:20px;
          margin: 10px 0 20px 20px;
        }
        .header img { height:80px; }
        .header h2 {
          font-size: 3em;
          font-weight: 1000;
          letter-spacing: 2px;
          color: #0044cc;
          margin: 0;
        }
        #wrapper {
          display:flex;
          align-items:flex-start;
          justify-content:flex-start;
        //   width:80%;
          padding-right: 0px;
          box-sizing: border-box;
        }
        #print-chart {
          transform-origin: center center;
          display:inline-block;
          overflow: visible;

        }
        .google-visualization-orgchart-table path {
          stroke:#0044cc !important;
          stroke-width:2.5px !important;
        }
      </style>
    </head>
    <body>
      <div class="header"
        <img src="logo-removebg-preview.png" alt="Logo"/>
        <h2>Suprajit</h2>
      </div>

      <div id="wrapper"><div id="print-chart"></div></div>
      
      <script>
        google.charts.load('current', { packages:["orgchart"] });
        google.charts.setOnLoadCallback(drawPrintChart);

        function drawPrintChart() {
          const chartData = new google.visualization.DataTable();
          chartData.addColumn('string','Name');
          chartData.addColumn('string','Manager');
          chartData.addColumn('string','ToolTip');

          const data = ${JSON.stringify(lastData)};
          data.forEach(row => {
            chartData.addRow([
              {v: row.ID.toString(), f: row.First_Name+" ("+row.Designation+")"},
              row["Parent ID"] ? row["Parent ID"].toString() : '',
              row.Designation
            ]);
          });

          const container = document.getElementById('print-chart');
          const chart = new google.visualization.OrgChart(container);
          chart.draw(chartData,{allowHtml:true});

          setTimeout(()=>{
            const rect = container.getBoundingClientRect();
            const pageWidth = window.innerWidth - 80;
            const pageHeight = window.innerHeight - 80;

            let scale = Math.min(pageWidth / rect.width, pageHeight / rect.height);
            if (scale > 1) scale = 1;

            container.style.transform = "scale(" + scale + ")";
            container.style.transformOrigin = "top left";

            // ✅ This will open print preview of popup
            window.print();
          }, 1000);
        }

        window.onafterprint = () => window.close();
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
});


// ✅ Reset main window state after printing
window.onafterprint = function () {
  document.getElementById('search').value = '';
  drawChart(originalData);
  lastData = originalData;
};

// window.addEventListener('resize', () => {
//   if (lastData.length > 0) {
//     drawChart(lastData);
//   }
// });

