let platforms = [];
let isAllVisible = false;
let passwordStates = {};
let currentEditIndex = -1;
let collapsedStates = {};
let currentEnvIndex = {};

function init() {
  loadPlatforms();
}

function loadPlatforms() {
  chrome.storage.local.get(['platforms'], (result) => {
    if (result.platforms && result.platforms.length > 0) {
      platforms = result.platforms.map(p => {
        if (p.envs && Array.isArray(p.envs)) {
          return {
            name: p.name || '',
            sort: p.sort || 0,
            envs: p.envs.map(env => ({
              name: env.name || '',
              url: env.url || '',
              icon: env.icon || (env.url ? env.url + '/favicon.ico' : ''),
              accounts: (env.accounts || []).map(a => ({
                name: a.name || '',
                username: a.username || '',
                password: a.password || ''
              }))
            }))
          };
        }
        return migrateToNewFormat(p);
      });
      savePlatforms();
    } else {
      platforms = getPlatforms();
      savePlatforms();
    }
    renderPlatformList();
    bindEvents();
  });
}

function migrateToNewFormat(legacyPlatform) {
  return {
    name: legacyPlatform.name || '',
    sort: legacyPlatform.sort || 0,
    envs: [
      {
        name: '生产环境',
        url: legacyPlatform.url || '',
        icon: legacyPlatform.icon || (legacyPlatform.url ? legacyPlatform.url + '/favicon.ico' : ''),
        accounts: (legacyPlatform.accounts || []).map(a => ({
          name: a.name || '',
          username: a.username || '',
          password: a.password || ''
        }))
      }
    ]
  };
}

function savePlatforms() {
  chrome.storage.local.set({ platforms: platforms });
}

function renderPlatformList(filter = '') {
  const list = document.getElementById('platformList');
  list.innerHTML = '';
  
  const filtered = platforms
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .filter(p => 
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.envs || []).some(env => 
        (env.url && env.url.toLowerCase().includes(filter.toLowerCase())) ||
        (env.accounts || []).some(acc => 
          (acc.name && acc.name.toLowerCase().includes(filter.toLowerCase())) ||
          (acc.username && acc.username.toLowerCase().includes(filter.toLowerCase()))
        )
      )
    );
  
  filtered.forEach((platform) => {
    const actualIndex = platforms.indexOf(platform);
    
    if (currentEnvIndex[actualIndex] === undefined) {
      currentEnvIndex[actualIndex] = 0;
    }
    const envIndex = currentEnvIndex[actualIndex];
    const env = platform.envs[envIndex];
    
    const item = document.createElement('div');
    item.className = 'platform-item';
    
    if (collapsedStates[`${actualIndex}`] === undefined) {
      collapsedStates[`${actualIndex}`] = env.accounts.length > 1 ? true : false;
    }
    const isCollapsed = env.accounts.length > 1 && collapsedStates[`${actualIndex}`];
    
    const displayAccounts = isCollapsed ? env.accounts.slice(0, 1) : env.accounts;
    let accountsHtml = '';
    displayAccounts.forEach((account, accIndex) => {
      const isVisible = passwordStates[`${actualIndex}-${accIndex}`] || false;
      const displayPassword = isVisible ? account.password : '••••••••';
      const accountLabel = account.name || `账号 ${accIndex + 1}`;
      accountsHtml += `
        <div class="account-card">
          <div class="account-header">
            <span class="account-label">${accountLabel}</span>
            <div class="account-actions">
              <button class="copy-all-btn" data-index="${actualIndex}" data-accindex="${accIndex}">复制账号密码</button>
            </div>
          </div>
          <div class="account-body">
            <div class="field">
              <label>账号</label>
              <div class="value">
                <span class="account-text">${account.username}</span>
                <button class="copy-btn" data-copy="${account.username}">复制</button>
              </div>
            </div>
            <div class="field">
              <label>密码</label>
              <div class="value">
                <span class="password-text ${isVisible ? '' : 'hidden'}">${displayPassword}</span>
                <button class="toggle-pwd-btn" data-index="${actualIndex}" data-accindex="${accIndex}">${isVisible ? '隐藏' : '显示'}</button>
                <button class="copy-btn" data-copy="${account.password}">复制</button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    const platformIcon = env.icon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23ddd%22/><text y=%22.9em%22 font-size=%2280%22 text-anchor=%22middle%22>🔐</text></svg>';
    const envSelectHtml = platform.envs.length > 1 
      ? `<select class="env-select" data-index="${actualIndex}">${platform.envs.map((e, i) => `<option value="${i}" ${i === envIndex ? 'selected' : ''}>${e.name}</option>`).join('')}</select>`
      : '';
    
    const collapseIconHtml = env.accounts.length > 1 
      ? `<span class="collapse-icon" data-index="${actualIndex}">${isCollapsed ? '▶' : '▼'}</span>`
      : '';
    
    item.innerHTML = `
      <div class="platform-header">
        <div class="platform-info">
          ${collapseIconHtml}
          <img src="${platformIcon}" alt="${platform.name}" class="platform-icon clickable" data-url="${env.url}">
          <div class="platform-details">
            <div class="platform-name-row">
              <span class="platform-name clickable" data-url="${env.url}">${platform.name}</span>
              ${envSelectHtml}
            </div>
            <div class="platform-url clickable" data-url="${env.url}">${env.url}</div>
          </div>
        </div>
        <div class="platform-actions">
          <button class="edit-platform-btn" data-index="${actualIndex}">编辑</button>
          <button class="delete-platform-btn" data-index="${actualIndex}">删除</button>
        </div>
      </div>
      <div class="account-info">
        ${accountsHtml}
      </div>
    `;
    
    list.appendChild(item);
  });
  
  bindCollapseEvents();
  bindEnvSelectEvents();
  bindCopyEvents();
  bindToggleEvents();
  bindEditEvents();
  updateTotalCount();
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderPlatformList(e.target.value);
  });
  
  document.getElementById('toggleAllBtn').addEventListener('click', () => {
    isAllVisible = !isAllVisible;
    platforms.forEach((platform, pIndex) => {
      const envIndex = currentEnvIndex[pIndex] || 0;
      const env = platform.envs[envIndex];
      if (env && env.accounts) {
        env.accounts.forEach((_, accIndex) => {
          passwordStates[`${pIndex}-${accIndex}`] = isAllVisible;
        });
      }
    });
    document.getElementById('toggleAllBtn').textContent = isAllVisible ? '隐藏全部' : '显示全部';
    renderPlatformList(document.getElementById('searchInput').value);
  });
  
  document.getElementById('addPlatformBtn').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'block';
    resetAddForm();
  });
  
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      document.getElementById(modalId).style.display = 'none';
    });
  });
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('clickable')) {
      const url = e.target.getAttribute('data-url');
      if (url) {
        window.open(url, '_blank');
      }
    }
  });
  
  document.getElementById('addEnvBtn').addEventListener('click', () => {
    addEnvRow('newEnvFields');
  });
  
  document.getElementById('copyEnvBtn').addEventListener('click', () => {
    const envRows = document.querySelectorAll('#newEnvFields .env-row');
    if (envRows.length > 0) {
      const lastEnvRow = envRows[envRows.length - 1];
      const envData = {
        name: lastEnvRow.querySelector('.env-name-input').value,
        url: lastEnvRow.querySelector('.env-url-input').value,
        icon: lastEnvRow.querySelector('.env-icon-input').value,
        accounts: []
      };
      lastEnvRow.querySelectorAll('.account-row').forEach(accRow => {
        envData.accounts.push({
          name: accRow.querySelector('.account-name-input').value,
          username: accRow.querySelector('.account-input').value,
          password: accRow.querySelector('.password-input').value
        });
      });
      addEnvRow('newEnvFields', envData);
    } else {
      addEnvRow('newEnvFields');
    }
  });
  
  document.getElementById('saveNewPlatformBtn').addEventListener('click', () => {
    saveNewPlatform();
  });
  
  document.getElementById('addEditEnvBtn').addEventListener('click', () => {
    addEnvRow('editEnvFields');
  });
  
  document.getElementById('copyEditEnvBtn').addEventListener('click', () => {
    const envRows = document.querySelectorAll('#editEnvFields .env-row');
    if (envRows.length > 0) {
      const lastEnvRow = envRows[envRows.length - 1];
      const envData = {
        name: lastEnvRow.querySelector('.env-name-input').value,
        url: lastEnvRow.querySelector('.env-url-input').value,
        icon: lastEnvRow.querySelector('.env-icon-input').value,
        accounts: []
      };
      lastEnvRow.querySelectorAll('.account-row').forEach(accRow => {
        envData.accounts.push({
          name: accRow.querySelector('.account-name-input').value,
          username: accRow.querySelector('.account-input').value,
          password: accRow.querySelector('.password-input').value
        });
      });
      addEnvRow('editEnvFields', envData);
    } else {
      addEnvRow('editEnvFields');
    }
  });
  
  document.getElementById('saveEditPlatformBtn').addEventListener('click', () => {
    saveEditPlatform();
  });
  
  // document.getElementById('deletePlatformBtn').addEventListener('click', () => {
  //   deleteCurrentPlatform();
  // });
  
  // document.getElementById('exportBtn').addEventListener('click', () => {
  //   exportData();
  // });
  
  // document.getElementById('importBtn').addEventListener('click', () => {
  //   document.getElementById('importFile').click();
  // });
  
  // document.getElementById('importFile').addEventListener('change', (e) => {
  //   importData(e);
  // });

  document.getElementById('copyPlatformBtn').addEventListener('click', () => {
    console.log(platforms)
    const dataStr = JSON.stringify(platforms, null, 2);
    console.log(dataStr)
    copyToClipboard(dataStr, document.getElementById('copyPlatformBtn'));
  });

  document.getElementById('updatePlatformBtn').addEventListener('click', () => {
    const input = document.getElementById('platformDataInput');
    const dataStr = input.value.trim();
    if (!dataStr) {
      alert('请粘贴平台数据');
      return;
    }
    try {
      const importedData = JSON.parse(dataStr);
      if (!Array.isArray(importedData)) {
        alert('数据格式错误');
        return;
      }
      platforms = importedData;
      savePlatforms();
      renderPlatformList();
      input.value = '';
      alert('更新成功！');
    } catch (err) {
      alert('解析失败: ' + err.message);
    }
  });
}

function bindCopyEvents() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.getAttribute('data-copy');
      copyToClipboard(text, btn);
    });
  });
  
  document.querySelectorAll('.copy-all-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pIndex = parseInt(btn.getAttribute('data-index'));
      const accIndex = parseInt(btn.getAttribute('data-accindex'));
      const envIndex = currentEnvIndex[pIndex] || 0;
      const account = platforms[pIndex].envs[envIndex].accounts[accIndex];
      const text = `${account.username} ${account.password}`;
      copyToClipboard(text, btn);
    });
  });
}

function bindEnvSelectEvents() {
  document.querySelectorAll('.env-select').forEach(select => {
    select.addEventListener('change', () => {
      const pIndex = parseInt(select.getAttribute('data-index'));
      currentEnvIndex[pIndex] = parseInt(select.value);
      collapsedStates[`${pIndex}`] = collapsedStates[`${pIndex}`] !== undefined 
        ? collapsedStates[`${pIndex}`] 
        : false;
      renderPlatformList(document.getElementById('searchInput').value);
    });
  });
}

function bindCollapseEvents() {
  document.querySelectorAll('.collapse-icon').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      collapsedStates[`${index}`] = !collapsedStates[`${index}`];
      renderPlatformList(document.getElementById('searchInput').value);
    });
  });
}

function copyToClipboard(text, btn) {
  const originalText = btn.textContent;
  btn.textContent = '已复制';
  btn.classList.add('copied');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 1500);
    }).catch(err => {
      console.error('复制失败:', err);
      fallbackCopy(text);
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('copied');
      }, 1500);
    });
  } else {
    fallbackCopy(text);
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 1500);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('后备复制失败:', err);
    alert('复制失败，请重试');
  }
  document.body.removeChild(textarea);
}

function bindToggleEvents() {
  document.querySelectorAll('.toggle-pwd-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pIndex = btn.getAttribute('data-index');
      const accIndex = btn.getAttribute('data-accindex');
      const envIndex = currentEnvIndex[pIndex] || 0;
      const key = `${pIndex}-${accIndex}`;
      passwordStates[key] = !passwordStates[key];
      renderPlatformList(document.getElementById('searchInput').value);
    });
  });
}

function bindEditEvents() {
  document.querySelectorAll('.edit-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEditIndex = parseInt(btn.getAttribute('data-index'));
      openEditModal(currentEditIndex);
    });
  });
  
  document.querySelectorAll('.delete-platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      if (confirm('确定要删除这个平台吗？')) {
        platforms.splice(index, 1);
        savePlatforms();
        renderPlatformList();
      }
    });
  });
}

function resetAddForm() {
  document.getElementById('newPlatformName').value = '';
  document.getElementById('newPlatformSort').value = 0;
  document.getElementById('newEnvFields').innerHTML = '';
  addEnvRow('newEnvFields');
}

function addEnvRow(containerId, envData = null) {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'env-row';
  const envName = envData ? envData.name : '';
  const envUrl = envData ? envData.url : '';
  const envIcon = envData ? envData.icon : '';
  row.innerHTML = `
    <div class="env-header">
      <input type="text" class="env-name-input" placeholder="环境名称（如：生产环境）" value="${envName}">
      <button class="remove-env-btn">× 删除环境</button>
    </div>
    <div class="env-body">
      <input type="text" class="env-url-input" placeholder="网站URL" value="${envUrl}">
      <input type="text" class="env-icon-input" placeholder="图标URL（可选）" value="${envIcon}">
      <div class="account-list"></div>
      <button class="add-account-btn">+ 添加账号</button>
    </div>
  `;
  container.appendChild(row);
  
  const accountList = row.querySelector('.account-list');
  if (envData && envData.accounts) {
    envData.accounts.forEach(acc => addAccountRowToEnv(accountList, acc));
  } else {
    addAccountRowToEnv(accountList);
  }
  
  row.querySelector('.remove-env-btn').addEventListener('click', () => row.remove());
  row.querySelector('.add-account-btn').addEventListener('click', () => addAccountRowToEnv(accountList));
}

function addAccountRowToEnv(container, accountData = null) {
  const row = document.createElement('div');
  row.className = 'account-row';
  const accountName = accountData ? accountData.name : '';
  const username = accountData ? accountData.username : '';
  const password = accountData ? accountData.password : '';
  row.innerHTML = `
    <input type="text" class="account-name-input" placeholder="账号名称（可选）" value="${accountName}">
    <input type="text" class="account-input" placeholder="账号" value="${username}">
    <input type="text" class="password-input" placeholder="密码" value="${password}">
    <button class="remove-row-btn">×</button>
  `;
  container.appendChild(row);
  row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
}

function saveNewPlatform() {
  const name = document.getElementById('newPlatformName').value.trim();
  const sort = parseInt(document.getElementById('newPlatformSort').value) || 0;
  
  if (!name) {
    alert('请填写平台名称');
    return;
  }
  
  const envs = [];
  const envRows = document.querySelectorAll('#newEnvFields .env-row');
  
  if (envRows.length === 0) {
    alert('请至少添加一个环境');
    return;
  }
  
  envRows.forEach(row => {
    const envName = row.querySelector('.env-name-input').value.trim() || '生产环境';
    const envUrl = row.querySelector('.env-url-input').value.trim();
    const envIcon = row.querySelector('.env-icon-input').value.trim();
    
    if (!envUrl) return;
    
    const accounts = [];
    row.querySelectorAll('.account-row').forEach(accRow => {
      const accountName = accRow.querySelector('.account-name-input').value.trim();
      const username = accRow.querySelector('.account-input').value.trim();
      const password = accRow.querySelector('.password-input').value.trim();
      if (username && password) {
        accounts.push({ name: accountName || '', username, password });
      }
    });
    
    if (accounts.length > 0) {
      envs.push({
        name: envName,
        url: envUrl,
        icon: envIcon || envUrl + '/favicon.ico',
        accounts
      });
    }
  });
  
  if (envs.length === 0) {
    alert('请至少填写一个环境的URL和账号密码');
    return;
  }
  
  platforms.push({ name, sort, envs });
  savePlatforms();
  renderPlatformList();
  document.getElementById('addModal').style.display = 'none';
}

function openEditModal(index) {
  const platform = platforms[index];
  currentEditIndex = index;
  
  document.getElementById('editPlatformName').value = platform.name;
  document.getElementById('editPlatformSort').value = platform.sort || 0;
  
  const envFields = document.getElementById('editEnvFields');
  envFields.innerHTML = '';
  
  (platform.envs || []).forEach(env => {
    addEnvRow('editEnvFields', env);
  });
  
  document.getElementById('editModal').style.display = 'block';
}

function saveEditPlatform() {
  const name = document.getElementById('editPlatformName').value.trim();
  const sort = parseInt(document.getElementById('editPlatformSort').value) || 0;
  
  if (!name) {
    alert('请填写平台名称');
    return;
  }
  
  const envs = [];
  const envRows = document.querySelectorAll('#editEnvFields .env-row');
  
  envRows.forEach(row => {
    const envName = row.querySelector('.env-name-input').value.trim() || '生产环境';
    const envUrl = row.querySelector('.env-url-input').value.trim();
    const envIcon = row.querySelector('.env-icon-input').value.trim();
    
    if (!envUrl) return;
    
    const accounts = [];
    row.querySelectorAll('.account-row').forEach(accRow => {
      const accountName = accRow.querySelector('.account-name-input').value.trim();
      const username = accRow.querySelector('.account-input').value.trim();
      const password = accRow.querySelector('.password-input').value.trim();
      if (username && password) {
        accounts.push({ name: accountName || '', username, password });
      }
    });
    
    if (accounts.length > 0) {
      envs.push({
        name: envName,
        url: envUrl,
        icon: envIcon || envUrl + '/favicon.ico',
        accounts
      });
    }
  });
  
  if (envs.length === 0) {
    alert('请至少填写一个环境的URL和账号密码');
    return;
  }
  
  platforms[currentEditIndex] = { name, sort, envs };
  savePlatforms();
  renderPlatformList();
  document.getElementById('editModal').style.display = 'none';
}

function deleteCurrentPlatform() {
  if (confirm('确定要删除这个平台吗？')) {
    platforms.splice(currentEditIndex, 1);
    savePlatforms();
    renderPlatformList();
    document.getElementById('editModal').style.display = 'none';
  }
}

function updateTotalCount() {
  const countEl = document.getElementById('totalCount');
  if (countEl) {
    countEl.textContent = platforms.length;
  }
}

function exportData() {
  const dataStr = JSON.stringify(platforms, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'passwords_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      
      if (!Array.isArray(importedData)) {
        alert('导入数据格式错误');
        return;
      }
      
      const validData = importedData.filter(p => p.name && p.envs);
      
      if (validData.length === 0) {
        alert('没有有效的数据可导入');
        return;
      }
      
      platforms = validData.map(p => {
        if (p.envs) return p;
        return migrateToNewFormat(p);
      });
      
      if (confirm(`确定要导入 ${validData.length} 个平台数据吗？此操作将覆盖现有数据。`)) {
        savePlatforms();
        renderPlatformList();
        alert('导入成功！');
      }
    } catch (err) {
      alert('导入失败: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

document.addEventListener('DOMContentLoaded', init);

