// ── Default blocked sites ──────────────────────────────────
const DEFAULT_BLOCKED = ['youtube.com','twitter.com','x.com','instagram.com','reddit.com','tiktok.com','facebook.com','netflix.com'];

// ── Focus mode: block distracting sites ───────────────────
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  chrome.storage.local.get(['km_focus_mode', 'km_blocked_sites'], ({ km_focus_mode, km_blocked_sites }) => {
    if (!km_focus_mode) return;
    const blocked: string[] = km_blocked_sites ?? DEFAULT_BLOCKED;
    try {
      const host = new URL(details.url).hostname.replace(/^www\./, '');
      const isBlocked = blocked.some((b) => host === b || host.endsWith('.' + b));
      if (isBlocked) {
        chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL('index.html') + '?blocked=' + encodeURIComponent(host),
        });
      }
    } catch { /**/ }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('task-deadline-')) {
    const taskTitle = decodeURIComponent(alarm.name.replace('task-deadline-', ''));
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '⚡ Kingsmode Reminder',
      message: `Deadline today: "${taskTitle}"`,
      priority: 2,
    });
  }
  if (alarm.name === 'focus-mode-end') {
    chrome.storage.local.set({ km_focus_mode: false });
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: '✅ Focus session ended',
      message: 'Great work! Focus mode has been turned off.',
      priority: 1,
    });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SCHEDULE_ALARM') {
    const { id, title, deadline } = msg;
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(9, 0, 0, 0);
    const when = deadlineDate.getTime();
    if (when > Date.now()) {
      chrome.alarms.create(`task-deadline-${encodeURIComponent(title)}-${id}`, { when });
    }
  }
  if (msg.type === 'CANCEL_ALARM') {
    chrome.alarms.clear(`task-deadline-${encodeURIComponent(msg.title)}-${msg.id}`);
  }
  if (msg.type === 'START_FOCUS_MODE') {
    chrome.storage.local.set({ km_focus_mode: true, km_blocked_sites: msg.sites ?? DEFAULT_BLOCKED });
    if (msg.minutes) {
      chrome.alarms.create('focus-mode-end', { delayInMinutes: msg.minutes });
    }
  }
  if (msg.type === 'STOP_FOCUS_MODE') {
    chrome.storage.local.set({ km_focus_mode: false });
    chrome.alarms.clear('focus-mode-end');
  }
});
