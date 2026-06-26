// Content script for Tweet Unyeet extension.
//
// Saves tweets from the home timeline once they enter the viewport.

(function () {
  const DEFAULT_MAX_TWEETS = 100;
  const VIEWPORT_THRESHOLD = 0.1;

  const processedHrefs = new Set();
  const observedElements = new WeakSet();
  let pendingTweets = [];
  let saveTimeout = null;
  let primaryColumnObserver = null;

  function getStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  function setStorage(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => resolve());
    });
  }

  async function initializeProcessedHrefs() {
    const { savedTweets = [] } = await getStorage('savedTweets');
    for (const tweet of savedTweets) {
      if (tweet?.href) processedHrefs.add(tweet.href);
    }
  }

  async function getSettings() {
    const data = await getStorage(['maxTweets', 'enabledTimelines']);
    const maxTweets = data.maxTweets;
    return {
      maxTweets:
        typeof maxTweets === 'number' && maxTweets > 0 ? maxTweets : DEFAULT_MAX_TWEETS,
      enabledTimelines:
        data.enabledTimelines && typeof data.enabledTimelines === 'object'
          ? data.enabledTimelines
          : {},
    };
  }

  function isOnHomeTimeline() {
    const path = window.location.pathname.replace(/\/$/, '');
    return path === '/home';
  }

  function findTimelineTablist() {
    const selectors = [
      '[data-testid="primaryColumn"] [data-testid="ScrollSnap-List"]',
      '[data-testid="primaryColumn"] [role="tablist"]',
    ];

    for (const selector of selectors) {
      const tablist = document.querySelector(selector);
      if (tablist?.querySelector('[role="tab"]')) return tablist;
    }

    return null;
  }

  function parseTimelineTab(tab) {
    if (!tab) return null;

    const link = tab.matches('a[href]') ? tab : tab.querySelector('a[href]');
    const href = (link?.getAttribute('href') || '').split('?')[0];
    const label = (tab.getAttribute('aria-label') || tab.textContent || '')
      .trim()
      .replace(/\s+/g, ' ');

    if (!label && !href) return null;

    const id = href || slugify(label);
    return { id, label: label || href };
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getActiveTimeline() {
    const tablist = findTimelineTablist();
    if (!tablist) return null;
    const active = tablist.querySelector('[role="tab"][aria-selected="true"]');
    return parseTimelineTab(active);
  }

  function scanAvailableTimelines() {
    const tablist = findTimelineTablist();
    if (!tablist) return [];

    const timelines = [];
    const seen = new Set();

    tablist.querySelectorAll('[role="tab"]').forEach((tab) => {
      const parsed = parseTimelineTab(tab);
      if (!parsed || seen.has(parsed.id)) return;
      seen.add(parsed.id);
      timelines.push(parsed);
    });

    return timelines;
  }

  async function syncAvailableTimelines() {
    if (!isOnHomeTimeline()) return;

    const timelines = scanAvailableTimelines();
    if (timelines.length === 0) return;

    const data = await getStorage(['availableTimelines', 'enabledTimelines']);
    const enabledTimelines = { ...(data.enabledTimelines || {}) };

    for (const timeline of timelines) {
      if (!(timeline.id in enabledTimelines)) {
        enabledTimelines[timeline.id] = true;
      }
    }

    const prev = JSON.stringify(data.availableTimelines || []);
    const next = JSON.stringify(timelines);
    if (prev !== next || Object.keys(enabledTimelines).length !== Object.keys(data.enabledTimelines || {}).length) {
      await setStorage({ availableTimelines: timelines, enabledTimelines });
    }
  }

  function isReplyTweet(el) {
    const socialContext = el.querySelector('[data-testid="socialContext"]');
    if (!socialContext) return false;
    const text = socialContext.textContent?.toLowerCase() || '';
    return text.includes('replying to');
  }

  function normalizeStatusHref(href) {
    if (!href) return null;
    try {
      const url = new URL(href, window.location.origin);
      const match = url.pathname.match(/(\/[^/]+\/status\/\d+)/);
      if (!match) return null;
      return url.origin + match[1];
    } catch {
      return null;
    }
  }

  function extractStatusHref(el) {
    const candidates = [];

    const timeAnchor = el.querySelector('time')?.closest('a');
    if (timeAnchor?.href) candidates.push(timeAnchor.href);

    const userNameLink = el.querySelector(
      '[data-testid="User-Name"] a[href*="/status/"]'
    );
    if (userNameLink?.href) candidates.push(userNameLink.href);

    el.querySelectorAll('a[href*="/status/"]').forEach((link) => {
      if (link.href) candidates.push(link.href);
    });

    const seen = new Set();
    for (const raw of candidates) {
      const href = normalizeStatusHref(raw);
      if (href && !seen.has(href)) {
        seen.add(href);
        return href;
      }
    }

    return null;
  }

  function parseTweetElement(el, timeline) {
    const href = extractStatusHref(el);
    if (!href) return null;

    let author = '';
    const userNameContainer = el.querySelector('[data-testid="User-Name"]');
    if (userNameContainer) {
      author = userNameContainer.innerText.replace(/\n/g, ' ').trim();
    }

    let content = '';
    const textContainer = el.querySelector('[data-testid="tweetText"]');
    if (textContainer) {
      content = textContainer.innerText.trim();
    }

    return {
      author,
      content,
      href,
      timeline: timeline ? { id: timeline.id, label: timeline.label } : null,
    };
  }

  function getPrimaryColumn() {
    return document.querySelector('[data-testid="primaryColumn"]');
  }

  async function shouldSaveTweet(el, timeline, settings) {
    if (!isOnHomeTimeline()) return false;
    if (!timeline) return false;
    if (settings.enabledTimelines[timeline.id] !== true) return false;
    if (isReplyTweet(el)) return false;
    return true;
  }

  async function flushPendingSaves() {
    if (pendingTweets.length === 0) return;

    const settings = await getSettings();
    const maxTweets = settings.maxTweets;
    const { savedTweets: existing = [] } = await getStorage('savedTweets');
    let savedTweets = existing;

    for (const tweetObj of pendingTweets) {
      if (!processedHrefs.has(tweetObj.href)) {
        processedHrefs.add(tweetObj.href);
        savedTweets.unshift(tweetObj);
      }
    }
    pendingTweets = [];

    if (savedTweets.length > maxTweets) {
      savedTweets = savedTweets.slice(0, maxTweets);
    }

    await setStorage({ savedTweets });
  }

  function scheduleSave(tweetObj) {
    pendingTweets.push(tweetObj);
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(flushPendingSaves, 300);
  }

  const intersectionObserver = new IntersectionObserver(
    async (entries) => {
      if (!isOnHomeTimeline()) return;

      const timeline = getActiveTimeline();
      const settings = await getSettings();

      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (entry.intersectionRatio < VIEWPORT_THRESHOLD) continue;

        const el = entry.target;
        intersectionObserver.unobserve(el);
        observedElements.delete(el);

        if (!(await shouldSaveTweet(el, timeline, settings))) continue;

        const tweetObj = parseTweetElement(el, timeline);
        if (!tweetObj || processedHrefs.has(tweetObj.href)) continue;

        scheduleSave(tweetObj);
      }
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: VIEWPORT_THRESHOLD,
    }
  );

  function observeTweet(el) {
    if (!(el instanceof Element)) return;
    if (observedElements.has(el)) return;
    observedElements.add(el);
    intersectionObserver.observe(el);
  }

  function observeAllTweets(root) {
    if (!root) return;
    root.querySelectorAll('[data-testid="tweet"]').forEach(observeTweet);
  }

  function bindPrimaryColumn(column) {
    if (!column) return;

    observeAllTweets(column);

    if (primaryColumnObserver) primaryColumnObserver.disconnect();
    primaryColumnObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-testid="tweet"]')) observeTweet(node);
          observeAllTweets(node);
        }
      }
    });

    primaryColumnObserver.observe(column, { childList: true, subtree: true });
  }

  let boundPrimaryColumn = null;

  function watchForPrimaryColumn() {
    if (!isOnHomeTimeline()) {
      if (primaryColumnObserver) {
        primaryColumnObserver.disconnect();
        primaryColumnObserver = null;
      }
      boundPrimaryColumn = null;
      return;
    }

    const column = getPrimaryColumn();
    if (!column || column === boundPrimaryColumn) return;

    boundPrimaryColumn = column;
    bindPrimaryColumn(column);
  }

  let tablistObserver = null;

  function watchTimelineTabs() {
    if (!isOnHomeTimeline()) {
      if (tablistObserver) {
        tablistObserver.disconnect();
        tablistObserver = null;
      }
      return;
    }

    syncAvailableTimelines();

    const tablist = findTimelineTablist();
    if (!tablist) return;

    if (tablistObserver) tablistObserver.disconnect();
    tablistObserver = new MutationObserver(() => {
      syncAvailableTimelines();
    });
    tablistObserver.observe(tablist, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-selected'],
    });
  }

  function onRouteChange() {
    watchForPrimaryColumn();
    watchTimelineTabs();
  }

  (async function start() {
    await initializeProcessedHrefs();
    onRouteChange();

    const bodyObserver = new MutationObserver(() => {
      onRouteChange();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', onRouteChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      onRouteChange();
    };
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      onRouteChange();
    };
  })();
})();