// 教务课表同步助手（内容脚本）
// 注入到 jwxt.szpu.edu.cn/jwapp/* 页面中，同源 fetch 自动带 JSESSIONID Cookie。


function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function downloadJson(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json; charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);

    a.click();

    // 给浏览器一点点时间再 revoke，避免极少数情况下文件空
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 1000);
}
async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_CONFIG, (cfg) => resolve(cfg));
    });
}

// UI 管理类：悬浮按钮、状态和自定义模态（改为块式输入面板）
class UIManager {
    constructor() {
        this.statusElId = 'jwxt-sync-status';
        this.btnId = 'jwxt-sync-btn';
        this.panelId = 'jwxt-panel-overlay';
        this._createFloatingUI();
        this._createPanel();
    }

    _createFloatingUI() {
        if (document.getElementById(this.btnId)) return;

        const wrap = document.createElement("div");
        wrap.style.cssText = `
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
      `;

        const btn = document.createElement("button");
        btn.id = this.btnId;
        btn.textContent = "导出课表";
        btn.style.cssText = `
        padding: 10px 14px;
        border: 0;
        border-radius: 10px;
        cursor: pointer;
        background: linear-gradient(180deg,#2b8cff,#1a62d8);
        color: #fff;
        box-shadow: 0 12px 30px rgba(26,98,216,.18);
        font-size: 14px;
      `;

        const status = document.createElement("div");
        status.id = this.statusElId;
        status.textContent = "就绪";
        status.style.cssText = `
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(0,0,0,.72);
        color: #fff;
        font-size: 12px;
        max-width: 320px;
        box-shadow: 0 6px 18px rgba(0,0,0,.14);
      `;

        wrap.appendChild(btn);
        wrap.appendChild(status);
        document.documentElement.appendChild(wrap);

        this.btn = btn;
        this.statusEl = status;
    }

    _createPanel() {
        if (document.getElementById(this.panelId)) return;

        const overlay = document.createElement('div');
        overlay.id = this.panelId;
        overlay.style.cssText = `
          position: fixed;left:0;top:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:1000001;padding:24px;box-sizing:border-box;
        `;

        const panel = document.createElement('div');
        panel.style.cssText = `
          width:100%;max-width:720px;background:#fff;border-radius:12px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,0.28);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",Arial,sans-serif;
        `;

        // header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
        const title = document.createElement('div');
        title.textContent = '导出课表';
        title.style.cssText = 'font-size:16px;font-weight:600;color:#111;';
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'border:0;background:transparent;font-size:20px;cursor:pointer;color:#666;';
        closeBtn.addEventListener('click', () => this._resolvePanel({ action: 'cancel' }));
        header.appendChild(title);
        header.appendChild(closeBtn);

        // body: inputs
        const body = document.createElement('div');
        body.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;align-items:start;';

        // 学期块
        const semWrap = document.createElement('div');
        const semLabel = document.createElement('label');
        semLabel.textContent = '学年学期 (XNXQDM)';
        semLabel.style.cssText = 'display:block;margin-bottom:6px;font-size:13px;color:#333;font-weight:500;';
        const semSelect = document.createElement('select');
        semSelect.id = 'jwxt-panel-sem';
        semSelect.style.cssText = 'width:100%;padding:8px;border-radius:8px;border:1px solid #e6e6e6;font-size:13px;';
        semWrap.appendChild(semLabel);
        semWrap.appendChild(semSelect);

        // 学号块
        const xhWrap = document.createElement('div');
        const xhLabel = document.createElement('label');
        xhLabel.textContent = '学号 (XH)';
        xhLabel.style.cssText = 'display:block;margin-bottom:6px;font-size:13px;color:#333;font-weight:500;';
        const xhInput = document.createElement('input');
        xhInput.id = 'jwxt-panel-xh';
        xhInput.type = 'text';
        xhInput.placeholder = '请输入学号';
        xhInput.style.cssText = 'width:100%;padding:8px;border-radius:8px;border:1px solid #e6e6e6;font-size:13px;';
        xhWrap.appendChild(xhLabel);
        xhWrap.appendChild(xhInput);

        body.appendChild(semWrap);
        body.appendChild(xhWrap);

        // message / log 区块
        const log = document.createElement('div');
        log.id = 'jwxt-panel-log';
        log.style.cssText = 'margin-top:8px;padding:10px;border-radius:8px;background:#f7f9fc;border:1px solid #eef3ff;min-height:80px;max-height:240px;overflow:auto;font-size:13px;color:#2b2b2b;';
        log.innerHTML = '<strong>提示</strong>：在此显示状态、警告或错误。';

        // actions
        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;';

        const cancel = document.createElement('button');
        cancel.textContent = '取消';
        cancel.style.cssText = 'padding:8px 12px;border-radius:8px;border:1px solid #dcdcdc;background:#fff;cursor:pointer;';
        cancel.addEventListener('click', () => this._resolvePanel({ action: 'cancel' }));

        const exportBtn = document.createElement('button');
        exportBtn.textContent = '导出';
        exportBtn.style.cssText = 'padding:8px 12px;border-radius:8px;border:0;background:#1677ff;color:#fff;cursor:pointer;';
        exportBtn.addEventListener('click', () => {
            const payload = {
                action: 'export',
                xnxqdm: semSelect.value,
                xh: xhInput.value.trim()
            };
            this._resolvePanel(payload);
        });

        actions.appendChild(cancel);
        actions.appendChild(exportBtn);

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(log);
        panel.appendChild(actions);

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // store refs
        this.panelOverlay = overlay;
        this.semSelect = semSelect;
        this.xhInput = xhInput;
        this.logEl = log;

        // close on overlay click (but not when clicking panel)
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this._resolvePanel({ action: 'cancel' }); });
    }

    // 计算默认学期及上下学期并填充 select
    _computeDefaultAndFill() {
        const now = new Date();
        const month = now.getMonth() + 1;
        let startYear, sem;
        if (month >= 9) {
            startYear = now.getFullYear();
            sem = 1;
        } else if (month <= 1) {
            startYear = now.getFullYear() - 1;
            sem = 1;
        } else {
            startYear = now.getFullYear() - 1;
            sem = 2;
        }
        const make = (s, semn) => `${s}-${s + 1}-${semn}`;
        const cur = make(startYear, sem);
        // prev and next
        let prevStart = startYear, prevSem = sem - 1;
        if (prevSem < 1) { prevSem = 2; prevStart = startYear - 1; }
        let nextStart = startYear, nextSem = sem + 1;
        if (nextSem > 2) { nextSem = 1; nextStart = startYear + 1; }
        const prev = make(prevStart, prevSem);
        const next = make(nextStart, nextSem);

        // clear and add
        const sel = this.semSelect;
        sel.innerHTML = '';
        [cur, prev, next].forEach(v => {
            const o = document.createElement('option');
            o.value = v; o.textContent = v;
            sel.appendChild(o);
        });
        sel.value = cur;
    }

    openPanel(defaultXh = '') {
        return new Promise((resolve) => {
            this._panelResolver = resolve;
            this._computeDefaultAndFill();
            this.xhInput.value = defaultXh || '';
            this.logEl.innerHTML = '<strong>提示</strong>：在此显示状态、警告或错误。';
            this.panelOverlay.style.display = 'flex';
            // focus
            setTimeout(() => this.xhInput.focus(), 120);
        });
    }

    _resolvePanel(result) {
        if (this._panelResolver) {
            this.panelOverlay.style.display = 'none';
            const r = this._panelResolver;
            this._panelResolver = null;
            r(result);
        }
    }

    setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
        this.appendLog(text, 'info');
    }

    appendLog(text, type = 'info') {
        if (!this.logEl) return;
        const line = document.createElement('div');
        line.style.cssText = 'padding:6px 8px;border-radius:6px;margin-bottom:8px;font-size:13px;';
        if (type === 'error') {
            line.style.background = 'linear-gradient(180deg,#fff3f3,#ffecec)';
            line.style.border = '1px solid #ffd6d6';
            line.style.color = '#b00020';
        } else if (type === 'warn') {
            line.style.background = 'linear-gradient(180deg,#fffaf0,#fff5e6)';
            line.style.border = '1px solid #ffe6b3';
            line.style.color = '#8a5a00';
        } else {
            line.style.background = '#fff';
            line.style.border = '1px solid #eef3ff';
            line.style.color = '#222';
        }
        const time = new Date().toLocaleTimeString();
        line.textContent = `[${time}] ${text}`;
        this.logEl.prepend(line);
    }

    showMessage(message, options = {}) {
        // 仍保留简洁模态提示
        const { timeout = 3000, title = '' } = options;
        const id = 'jwxt-custom-message-toast';
        let existing = document.getElementById(id);
        if (existing) existing.remove();
        const t = document.createElement('div');
        t.id = id;
        t.textContent = (title ? title + '：' : '') + message;
        t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:96px;background:rgba(0,0,0,0.8);color:#fff;padding:10px 14px;border-radius:10px;z-index:1000002;font-size:13px;';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), timeout);
    }
}

// 教务数据获取类（只负责发起请求，不处理响应体内容）
class TimetableService {
    constructor() {
        this.baseUrl = 'https://jwxt.szpu.edu.cn/jwapp/sys/kcbcxmdl/KbcxController';
    }

    async fetchTimetable(xnxqdm, xh) {
        const url = this.baseUrl + '/queryxskb.do';
        const requestParamStr = JSON.stringify({
            "*order": "+SKXQ,+KSJC,+JSJC",
            XNXQDM: xnxqdm,
            XH: xh
        });
        const body = new URLSearchParams({ requestParamStr });

        const resp = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            },
            body
        });

        // 不在此处解析或处理响应体，仅返回 Response 供调用方决定如何处理
        return resp;
    }
}

// 协调类：管理按钮点击、调用 TimetableService 并使用 UIManager 展示状态（不处理返回数据内容）
class ExportController {
    constructor(service, ui) {
        this.service = service;
        this.ui = ui;
        this._bind();
    }

    _guessXNXQDMFromPage() {
        const el = document.querySelector('#dqxnxq2');
        return el?.getAttribute('value') || '';
    }

    _bind() {
        const btn = document.getElementById(this.ui.btnId);
        if (!btn) return;
        btn.addEventListener('click', async () => {
            try {
                btn.disabled = true;
                btn.style.opacity = '0.75';
                await this.exportTimetable();
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        });
    }

    async exportTimetable() {
        try {
            this.ui.setStatus('准备导出…');

            // 用你自定义面板，不用原生 prompt
            const panelRes = await this.ui.openPanel(/* defaultXh 可按需传 */);
            if (!panelRes || panelRes.action !== 'export') {
                this.ui.setStatus('已取消');
                return;
            }

            const xnxqdm = (panelRes.xnxqdm || '').trim();
            const xh = (panelRes.xh || '').trim();

            if (!xnxqdm) {
                this.ui.appendLog('未填写 XNXQDM', 'warn');
                this.ui.setStatus('已取消：未填写 XNXQDM');
                return;
            }
            if (!xh) {
                this.ui.appendLog('未填写 学号 XH', 'warn');
                this.ui.setStatus('已取消：未填写学号');
                return;
            }

            this.ui.setStatus('正在向教务系统发送请求…');
            const resp = await this.service.fetchTimetable(xnxqdm, xh);

            const ct = (resp.headers.get('content-type') || '').toLowerCase();

            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                this.ui.appendLog(`HTTP ${resp.status}：${text.slice(0, 200)}`, 'error');
                this.ui.setStatus(`请求失败（HTTP ${resp.status}）`);
                return;
            }

            // ✅ 兜底：有时会返回 HTML（比如未登录），不要直接 resp.json() 硬崩
            let data;
            if (ct.includes('application/json') || ct.includes('text/json')) {
                data = await resp.json();
            } else {
                const text = await resp.text();
                this.ui.appendLog(`响应不是 JSON（Content-Type=${ct}），可能未登录或被重定向。`, 'error');
                this.ui.appendLog(text.slice(0, 300), 'error');
                this.ui.setStatus('导出失败：响应不是 JSON');
                return;
            }

            // 真正下载
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');

            const filename = `课表_${xnxqdm}_${xh}_${y}${m}${day}.json`;
            downloadJson(data, filename);

            this.ui.appendLog(`已下载：${filename}`, 'info');
            this.ui.setStatus('导出完成 ✅');
        } catch (err) {
            console.error(err);
            this.ui.appendLog(String(err), 'error');
            this.ui.setStatus('操作异常');
            this.ui.showMessage(String(err), { title: '异常' });
        }
    }
}

// 注入并初始化
const ui = new UIManager();
const timetableService = new TimetableService();
new ExportController(timetableService, ui);

// 可选：页面加载后小延迟，避免 DOM 还在变动
(async () => {
    await sleep(500);
    ui.setStatus('就绪（已注入）');
})();