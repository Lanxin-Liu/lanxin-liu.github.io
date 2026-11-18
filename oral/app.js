import { config } from './config.js';
import { slots, slotId, tally, rank, calendarEvent, escapeHTML as esc } from './model.js';

const $ = selector => document.querySelector(selector);
const invite = new URLSearchParams(location.hash.slice(1)).get('invite') || '';
const preview = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const apiBase = preview ? '' : config.apiBase;
const storageKey = 'oral-2026-november-24-25-edit';
let editToken = '';
try { editToken = localStorage.getItem(storageKey) || ''; } catch {}
let responses = [], selected = new Set(), online = false, busy = false, dirty = false, loadedOwn = false, confirmed = false;
let toastTimeout;

function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
function rememberToken(token) {
  editToken = token;
  try { localStorage.setItem(storageKey, token); } catch { toast('请保存修改码，以便之后修改您的回复。'); }
}
function toast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').hidden = true, 4500);
}
function message(text, error = false) {
  $('#form-message').textContent = text; $('#form-message').classList.toggle('error', error);
}
async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(apiBase + '/api' + path, {
      ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (preview ? 'local-preview' : invite), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || (response.status === 401 ? '邀请链接无效，请向组织者索取完整链接。' : '共享服务暂时不可用，请稍后重试。'));
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('连接超时，您的选择仍保留在本页，请稍后重试。');
    if (error instanceof TypeError) throw new Error('暂时无法连接共享日历，请检查网络后重试。');
    throw error;
  } finally { clearTimeout(timeout); }
}
function setConnection(text, error = false) {
  const notice = $('#connection-status'); notice.classList.toggle('error', error);
  notice.children[1].textContent = text; $('#retry-button').hidden = !error;
}
function updateControls() {
  $('#selection-count').textContent = selected.size ? `已选择 ${selected.size} 个时段` : '尚未选择时段';
  $('#save-state').textContent = busy ? '正在同步…' : dirty ? '尚有更改未提交' : confirmed ? '已同步 · 可继续修改' : '请勾选所有方便的时间';
  $('#save-button').disabled = busy || !online || !$('#teacher-name').value.trim() || !selected.size;
  $('#save-button').innerHTML = busy ? '正在提交…' : (confirmed ? '更新可用时间' : '提交可用时间') + ' <span aria-hidden="true">↗</span>';
  $('#teacher-name').disabled = busy; $('#teacher-note').disabled = busy;
  for (const button of document.querySelectorAll('.slot,.day-select')) button.disabled = busy;
  $('#delete-button').hidden = !confirmed; $('#delete-button').disabled = busy;
  $('#recovery-button').hidden = !confirmed; $('#recover-button').disabled = busy || !online;
  for (const button of document.querySelectorAll('.slot')) {
    const active = selected.has(button.dataset.id);
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
    button.querySelector('.slot-check').textContent = active ? '✓' : '';
  }
  for (const button of document.querySelectorAll('.day-select')) {
    button.textContent = config.hours.every(hour => selected.has(slotId(button.dataset.date, hour))) ? '取消当天' : '选择全天';
  }
}
function renderCalendar() {
  $('#day-grid').innerHTML = config.dates.map((date, index) => `<section class="day" aria-label="11月${24 + index}日 星期${index === 0 ? '二' : '三'}">
    <div class="day-header"><strong><span>11/</span>${24 + index}</strong><div>星期${index === 0 ? '二' : '三'}<br>November</div><button class="day-select" type="button" data-date="${date}">选择全天</button></div>
    ${[{ label: '上午', hours: config.hours.filter(hour => hour < 12) }, { label: '下午', hours: config.hours.filter(hour => hour > 12) }].map(session => `<div class="session-label"><span>${session.label}</span><span>1 HOUR / SLOT</span></div>${session.hours.map(hour => {
      const slot = slots.find(slot => slot.id === slotId(date, hour));
      return `<button class="slot" type="button" data-id="${slot.id}" aria-label="11月${24 + index}日 ${slot.label}" aria-pressed="false"><span>${slot.label}</span><span class="slot-check" aria-hidden="true"></span></button>`;
    }).join('')}`).join('')}</section>`).join('');
  $('#day-grid').addEventListener('click', event => {
    if (busy) return;
    const slot = event.target.closest('.slot'); const day = event.target.closest('.day-select');
    if (slot) selected.has(slot.dataset.id) ? selected.delete(slot.dataset.id) : selected.add(slot.dataset.id);
    if (day) {
      const ids = config.hours.map(hour => slotId(day.dataset.date, hour));
      const remove = ids.every(id => selected.has(id));
      for (const id of ids) remove ? selected.delete(id) : selected.add(id);
    }
    if (slot || day) { dirty = true; message(''); updateControls(); }
  });
}
function renderResults() {
  const counts = tally(responses), ranked = rank(responses), common = counts.filter(slot => slot.everyone);
  $('#response-count').textContent = responses.length; $('#common-count').textContent = common.length;
  $('#results-note').textContent = responses.length ? `基于 ${responses.length} 位已回复老师 · 每 30 秒自动同步` : '老师提交后，这里会自动更新';
  $('#ranked-slots').innerHTML = ranked.length ? ranked.map(slot => `<article class="rank-card${slot.everyone ? ' everyone' : ''}"><div class="rank-top"><span>11 月 ${slot.date.slice(-2)} 日 · 周${slot.date.endsWith('24') ? '二' : '三'}</span><strong>${slot.everyone ? '全部已回复老师可用' : `${slot.count}/${responses.length} 位可用`}</strong></div><h3>${slot.label}</h3><div class="rank-bottom"><span class="rank-names">${slot.names.map(esc).join('、')}</span><button type="button" data-ics="${slot.id}" aria-label="导出11月${slot.date.slice(-2)}日 ${slot.label}候选时间">导出日历 ↗</button></div></article>`).join('') : `<div class="empty-state"><span aria-hidden="true">◷</span><p>${responses.length ? '暂时没有重合的可用时间' : '等待老师们的回复'}</p><small>${responses.length ? '可请老师补充更多方便的时段。' : '大家都方便的时间会出现在这里。'}</small></div>`;
  const ownId = confirmed ? responses.find(response => response.isOwn)?.id : null;
  $('#participants').innerHTML = responses.length ? responses.map(response => `<article class="participant"><span class="avatar" aria-hidden="true">${esc(Array.from(response.name)[0])}</span><div class="participant-body"><p class="participant-name">${esc(response.name)}${response.id === ownId ? '<span>您</span>' : ''}</p><p class="participant-meta">${response.slots.length} 个可用时段 · ${new Intl.DateTimeFormat('zh-CN', { timeZone: config.timeZone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(response.updatedAt))} 更新</p><details><summary>查看可用时间${response.note ? '与备注' : ''}</summary>${response.slots.map(id => { const slot = slots.find(item => item.id === id); return slot ? `<div>11/${slot.date.slice(-2)} ${slot.label}</div>` : ''; }).join('')}${response.note ? `<p class="participant-note">${esc(response.note)}</p>` : ''}</details></div></article>`).join('') : '<p class="muted empty-copy">暂时还没有回复，感谢您的参与。</p>';
}
async function loadOwn(token) {
  const { response } = await api('/response', { method: 'POST', body: JSON.stringify({ editToken: token }) });
  selected = new Set(response.slots); $('#teacher-name').value = response.name; $('#teacher-note').value = response.note;
  rememberToken(token); loadedOwn = true; confirmed = true; dirty = false;
}
async function refresh({ initial = false } = {}) {
  if (!preview && !/^[a-f0-9]{64}$/.test(invite)) {
    online = false; setConnection('请使用组织者发送的完整邀请链接，才能查看和填写共享日历。', true); updateControls(); return;
  }
  try {
    const result = await api('/responses'); responses = result.responses; online = true;
    if (initial && editToken && !loadedOwn && !dirty) {
      try { await loadOwn(editToken); } catch { /* The record may have been withdrawn. */ }
    }
    if (confirmed && editToken) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(editToken));
      const ownId = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
      responses = responses.map(response => ({ ...response, isOwn: response.id === ownId }));
    }
    setConnection(preview ? '本地预览 · 数据由本地共享服务保存，尚未发布到 GitHub Pages' : '共享日历已连接 · 您的选择在点击提交后同步给其他参与者');
    renderResults();
  } catch (error) { online = false; setConnection(error.message, true); }
  updateControls();
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('已复制'); return true; }
  catch { return false; }
}
function showUtility({ title, description, value = '', readOnly = true, actionText = '复制', onAction }) {
  $('#dialog-title').textContent = title; $('#dialog-description').textContent = description;
  $('#dialog-value').value = value; $('#dialog-value').readOnly = readOnly;
  $('#dialog-message').textContent = ''; $('#dialog-action').textContent = actionText;
  $('#dialog-action').onclick = async () => { try { await onAction(); } catch (error) { $('#dialog-message').textContent = error.message; } };
  $('#utility-dialog').showModal();
}
function showRecovery() {
  showUtility({ title: '保存您的修改码', description: '在另一台设备上输入此修改码，即可修改或撤回您的回复。请自行保管，不要发到群里。', value: editToken,
    onAction: async () => { if (!await copyText(editToken)) { $('#dialog-value').select(); $('#dialog-message').textContent = '请长按或使用 Ctrl/Cmd+C 复制。'; } } });
}
$('#response-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !online || !selected.size) return;
  const firstSave = !confirmed; const token = editToken || newToken();
  rememberToken(token); busy = true; updateControls(); message('');
  try {
    await api('/response', { method: 'PUT', body: JSON.stringify({ editToken: token, name: $('#teacher-name').value.trim(), note: $('#teacher-note').value.trim(), slots: [...selected] }) });
    confirmed = true; loadedOwn = true; dirty = false;
    message('已提交，感谢老师！如有变化，您可以在此更新。');
    await refresh(); if (firstSave) showRecovery();
  } catch (error) { message(error.message, true); }
  finally { busy = false; updateControls(); }
});
for (const input of [$('#teacher-name'), $('#teacher-note')]) input.addEventListener('input', () => { dirty = true; message(''); updateControls(); });
$('#refresh-button').onclick = () => { if (!busy) refresh(); };
$('#retry-button').onclick = () => { if (!busy) refresh({ initial: true }); };
$('#recovery-button').onclick = showRecovery;
$('#recover-button').onclick = () => {
  showUtility({ title: '使用修改码', description: '请输入首次提交后保存的修改码，载入您原来的回复。', readOnly: false, actionText: '载入我的回复', onAction: async () => {
    const token = $('#dialog-value').value.trim();
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('修改码应为 64 位字母和数字，请检查是否复制完整。');
    $('#dialog-action').disabled = true;
    try { await loadOwn(token); $('#utility-dialog').close(); updateControls(); await refresh(); toast('已载入您之前的回复'); }
    finally { $('#dialog-action').disabled = false; }
  } });
};
$('#delete-button').onclick = async () => {
  if (busy || !confirm('确定撤回您的全部可用时间吗？撤回后将不再计入共同时间。')) return;
  busy = true; updateControls();
  try {
    await api('/response', { method: 'DELETE', body: JSON.stringify({ editToken }) });
    selected.clear(); $('#teacher-name').value = ''; $('#teacher-note').value = ''; confirmed = false; dirty = false; loadedOwn = false;
    rememberToken(''); message('您的回复已撤回。'); await refresh();
  } catch (error) { message(error.message, true); }
  finally { busy = false; updateControls(); }
};
$('#share-button').onclick = async () => {
  if (!invite && !preview) { toast('请先向组织者获取完整邀请链接。'); return; }
  const link = location.origin + location.pathname + (invite ? '#invite=' + invite : '');
  if (!await copyText(link)) showUtility({ title: '邀请链接', description: '复制此链接发给需要参与的老师。', value: link, onAction: async () => { $('#dialog-value').select(); if (!await copyText(link)) $('#dialog-message').textContent = '请长按或使用 Ctrl/Cmd+C 复制。'; } });
};
$('#ranked-slots').addEventListener('click', event => {
  const button = event.target.closest('[data-ics]'); if (!button) return;
  const slot = slots.find(slot => slot.id === button.dataset.ics); if (!slot) return;
  const url = URL.createObjectURL(new Blob([calendarEvent(slot)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `oral-candidate-${slot.id.replace(/:/g, '')}.ics`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && !busy) refresh(); });
renderCalendar(); updateControls(); refresh({ initial: true });
setInterval(() => { if (!document.hidden && !busy) refresh(); }, 30_000);
