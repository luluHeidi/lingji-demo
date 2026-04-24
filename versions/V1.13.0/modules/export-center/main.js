/**
 * Export Center Module (M13)
 * Backend note: Export field configurations sourced from LangYaGe field library
 */

var ecTasks = [
  {
    taskId: 'EXP-20260420-001',
    taskName: '\u4e8c\u521b\u6388\u6743-\u5bf9\u8d26\u660e\u7ec6\u8868\u5bfc\u51fa',
    fileName: 'reconciliation_20260420.xlsx',
    createdAt: '2026-04-20 14:30:00',
    sourceModule: '\u4e8c\u521b\u6388\u6743\u7247\u5355',
    status: 'completed',
    fileSize: '2.3 MB',
    expireAt: '2026-04-27 14:30:00'
  },
  {
    taskId: 'EXP-20260418-001',
    taskName: '\u4e8c\u521b\u6388\u6743-\u5f15\u5165\u6743\u76ca\u4fe1\u606f\u5bfc\u51fa',
    fileName: 'rights_import_20260418.xlsx',
    createdAt: '2026-04-18 10:15:00',
    sourceModule: '\u4e8c\u521b\u6388\u6743\u7247\u5355',
    status: 'expired',
    fileSize: '5.1 MB',
    expireAt: '2026-04-25 10:15:00'
  },
  {
    taskId: 'EXP-20260424-001',
    taskName: '\u4e8c\u521b\u6388\u6743-\u6388\u6743\u7247\u5355\u81ea\u5b9a\u4e49\u5bfc\u51fa',
    fileName: 'custom_export_20260424.xlsx',
    createdAt: '2026-04-24 15:00:00',
    sourceModule: '\u4e8c\u521b\u6388\u6743\u7247\u5355',
    status: 'processing',
    fileSize: '-',
    expireAt: null
  }
];

var ecFilters = { sourceModule: '', status: '' };
var ecSortOrder = 'desc';

function initExportCenterModule() {
  console.log('[ExportCenter] Module init');
  renderEcFilters();
  renderEcTaskList();
}

function renderEcFilters() {
  var area = document.getElementById('ecFilterArea');
  if (!area) return;
  area.innerHTML = '<div class="ec-filters">'
    + '<div class="ec-filter-group"><label>\u6765\u6e90\u6a21\u5757</label>'
    + '<select class="ec-filter-sel" id="ecFilterSource" onchange="applyEcFilters()">'
    + '<option value="">\u5168\u90e8</option>'
    + '<option value="\u4e8c\u521b\u6388\u6743\u7247\u5355"' + (ecFilters.sourceModule === '\u4e8c\u521b\u6388\u6743\u7247\u5355' ? ' selected' : '') + '>\u4e8c\u521b\u6388\u6743\u7247\u5355</option>'
    + '</select></div>'
    + '<div class="ec-filter-group"><label>\u5bfc\u51fa\u72b6\u6001</label>'
    + '<select class="ec-filter-sel" id="ecFilterStatus" onchange="applyEcFilters()">'
    + '<option value="">\u5168\u90e8</option>'
    + '<option value="processing"' + (ecFilters.status === 'processing' ? ' selected' : '') + '>\u5904\u7406\u4e2d</option>'
    + '<option value="completed"' + (ecFilters.status === 'completed' ? ' selected' : '') + '>\u5904\u7406\u5b8c\u6210</option>'
    + '<option value="failed"' + (ecFilters.status === 'failed' ? ' selected' : '') + '>\u5904\u7406\u5931\u8d25</option>'
    + '<option value="expired"' + (ecFilters.status === 'expired' ? ' selected' : '') + '>\u5df2\u8fc7\u671f</option>'
    + '</select></div>'
    + '</div>';
}

function applyEcFilters() {
  var srcEl = document.getElementById('ecFilterSource');
  var stEl = document.getElementById('ecFilterStatus');
  ecFilters.sourceModule = srcEl ? srcEl.value : '';
  ecFilters.status = stEl ? stEl.value : '';
  renderEcTaskList();
}

function getEcFilteredTasks() {
  return ecTasks.filter(function(t) {
    if (ecFilters.sourceModule && t.sourceModule !== ecFilters.sourceModule) return false;
    if (ecFilters.status && t.status !== ecFilters.status) return false;
    return true;
  });
}

function renderEcTaskList() {
  var container = document.getElementById('ecTaskList');
  if (!container) return;
  var tasks = getEcFilteredTasks();
  tasks.sort(function(a, b) {
    var da = new Date(a.createdAt), db = new Date(b.createdAt);
    return ecSortOrder === 'desc' ? db - da : da - db;
  });

  if (tasks.length === 0) {
    container.innerHTML = '<div class="ec-empty">\u6682\u65e0\u5bfc\u51fa\u4efb\u52a1</div>';
    return;
  }

  var sortIcon = ecSortOrder === 'desc' ? '\u2193' : '\u2191';
  var html = '<table class="ec-table"><thead><tr>'
    + '<th>#</th>'
    + '<th>\u4efb\u52a1\u540d\u79f0</th>'
    + '<th>\u6587\u4ef6\u540d\u79f0</th>'
    + '<th class="ec-sortable" onclick="toggleEcSort()">\u521b\u5efa\u65f6\u95f4 ' + sortIcon + '</th>'
    + '<th>\u6765\u6e90\u6a21\u5757</th>'
    + '<th>\u5bfc\u51fa\u72b6\u6001</th>'
    + '<th>\u6587\u4ef6\u5927\u5c0f</th>'
    + '<th>\u64cd\u4f5c</th>'
    + '</tr></thead><tbody>';

  tasks.forEach(function(t, idx) {
    var statusCls = 'ec-status-' + t.status;
    var statusLabel = { processing: '\u5904\u7406\u4e2d', completed: '\u5904\u7406\u5b8c\u6210', failed: '\u5904\u7406\u5931\u8d25', expired: '\u5df2\u8fc7\u671f' }[t.status] || t.status;
    var canDownload = t.status === 'completed';
    html += '<tr>'
      + '<td>' + (idx + 1) + '</td>'
      + '<td style="font-weight:500">' + t.taskName + '</td>'
      + '<td class="ec-mono">' + t.fileName + '</td>'
      + '<td style="font-size:12px">' + t.createdAt + '</td>'
      + '<td style="font-size:12px">' + t.sourceModule + '</td>'
      + '<td><span class="ec-status-tag ' + statusCls + '">' + statusLabel + '</span></td>'
      + '<td style="font-size:12px">' + (t.fileSize || '-') + '</td>'
      + '<td>'
      + '<button class="ec-btn-action' + (canDownload ? '' : ' disabled') + '" ' + (canDownload ? 'onclick="ecDownload(\'' + t.taskId + '\')"' : 'disabled') + '>\u4e0b\u8f7d</button>'
      + '<button class="ec-btn-action ec-btn-del" onclick="ecDelete(\'' + t.taskId + '\')">\u5220\u9664</button>'
      + '</td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function toggleEcSort() {
  ecSortOrder = ecSortOrder === 'desc' ? 'asc' : 'desc';
  renderEcTaskList();
}

function ecDownload(taskId) {
  var t = ecTasks.find(function(x) { return x.taskId === taskId; });
  if (t && typeof showSystemModal === 'function') {
    showSystemModal('\u4e0b\u8f7d\u6210\u529f', '\u5df2\u4e0b\u8f7d\u300c' + t.fileName + '\u300d\uff08mock\uff09', 'success');
  }
}

function ecDelete(taskId) {
  ecTasks = ecTasks.filter(function(x) { return x.taskId !== taskId; });
  renderEcTaskList();
}

/**
 * Global function: add export task from other modules (e.g., M4 auth sheet export)
 * Backend note: field config source is LangYaGe field library
 */
function addExportTask(taskName, sourceModule) {
  var now = new Date();
  var ts = now.getFullYear() + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2) + ('0'+now.getHours()).slice(-2) + ('0'+now.getMinutes()).slice(-2) + ('0'+now.getSeconds()).slice(-2);
  var task = {
    taskId: 'EXP-' + ts + '-' + String(Math.floor(Math.random()*900)+100),
    taskName: taskName || '\u5bfc\u51fa\u4efb\u52a1',
    fileName: 'export_' + ts + '.xlsx',
    createdAt: now.toLocaleString('zh-CN'),
    sourceModule: sourceModule || '-',
    status: 'processing',
    fileSize: '-',
    expireAt: null
  };
  ecTasks.unshift(task);
  // Simulate processing: complete after 3 seconds
  setTimeout(function() {
    var t = ecTasks.find(function(x) { return x.taskId === task.taskId; });
    if (t) {
      // 10% chance of failure
      if (Math.random() < 0.1) {
        t.status = 'failed';
      } else {
        t.status = 'completed';
        t.fileSize = (Math.random() * 10 + 0.5).toFixed(1) + ' MB';
        var expDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        t.expireAt = expDate.toLocaleString('zh-CN');
      }
      // Re-render if currently viewing export center
      if (document.getElementById('ecTaskList')) {
        renderEcTaskList();
      }
    }
  }, 3000);
  // Re-render if currently viewing export center
  if (document.getElementById('ecTaskList')) {
    renderEcTaskList();
  }
}
window.addExportTask = addExportTask;

// Module lifecycle
document.addEventListener('moduleLoaded', function(e) {
  if (e.detail && e.detail.moduleId === 'module-export-center') {
    initExportCenterModule();
  }
});
