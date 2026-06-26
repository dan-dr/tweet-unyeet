// Popup script for Tweet Unyeet extension.

const DEFAULT_MAX_TWEETS = 100;

document.addEventListener('DOMContentLoaded', () => {
  const tweetsContainer = document.getElementById('tweets');
  const maxTweetsInput = document.getElementById('maxTweets');
  const timelineToggles = document.getElementById('timelineToggles');
  const searchInput = document.getElementById('search');
  const tweetCountBadge = document.getElementById('tweetCount');

  let allTweets = [];

  function setSwitchState(button, checked) {
    button.dataset.state = checked ? 'checked' : 'unchecked';
    button.setAttribute('aria-checked', String(checked));
  }

  function fuzzyScore(query, text) {
    if (!query) return 1;
    const q = query.toLowerCase().trim();
    const t = text.toLowerCase();
    if (!q) return 1;
    if (t.includes(q)) return 1;

    let score = 0;
    let qIndex = 0;
    let lastMatch = -1;

    for (let i = 0; i < t.length && qIndex < q.length; i++) {
      if (t[i] === q[qIndex]) {
        score += lastMatch === i - 1 ? 2 : 1;
        lastMatch = i;
        qIndex++;
      }
    }

    return qIndex === q.length ? score / (t.length + q.length) : 0;
  }

  function filterTweets(tweets, query) {
    if (!query.trim()) return tweets;

    return tweets
      .map((tweet) => {
        const timelineLabel = tweet.timeline?.label || '';
        const haystack = `${tweet.author || ''} ${tweet.content || ''} ${timelineLabel}`;
        return { tweet, score: fuzzyScore(query, haystack) };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.tweet);
  }

  function renderTimelineToggles(availableTimelines, enabledTimelines) {
    timelineToggles.innerHTML = '';

    if (!availableTimelines.length) {
      const empty = document.createElement('p');
      empty.className = 'timeline-empty';
      empty.textContent = 'No timelines detected yet.';
      timelineToggles.appendChild(empty);
      return;
    }

    availableTimelines.forEach((timeline) => {
      const row = document.createElement('div');
      row.className = 'setting-row';

      const label = document.createElement('label');
      label.className = 'setting-label';
      label.setAttribute('for', `timeline-${timeline.id}`);

      const title = document.createElement('span');
      title.textContent = timeline.label;

      const subtitle = document.createElement('span');
      subtitle.textContent = timeline.id.startsWith('/') ? timeline.id : 'Home tab';

      label.appendChild(title);
      label.appendChild(subtitle);

      const toggle = document.createElement('button');
      toggle.id = `timeline-${timeline.id}`;
      toggle.className = 'switch';
      toggle.type = 'button';
      toggle.role = 'switch';
      toggle.dataset.timelineId = timeline.id;

      const thumb = document.createElement('span');
      thumb.className = 'switch-thumb';
      toggle.appendChild(thumb);

      const enabled = enabledTimelines[timeline.id] === true;
      setSwitchState(toggle, enabled);

      toggle.addEventListener('click', () => {
        const checked = toggle.dataset.state !== 'checked';
        setSwitchState(toggle, checked);
        chrome.storage.local.get('enabledTimelines', (data) => {
          const next = { ...(data.enabledTimelines || {}) };
          next[timeline.id] = checked;
          chrome.storage.local.set({ enabledTimelines: next });
        });
      });

      row.appendChild(label);
      row.appendChild(toggle);
      timelineToggles.appendChild(row);
    });
  }

  function renderTweets(tweets) {
    tweetsContainer.innerHTML = '';
    const filtered = filterTweets(tweets, searchInput.value);

    tweetCountBadge.textContent =
      searchInput.value.trim() && filtered.length !== tweets.length
        ? `${filtered.length} of ${tweets.length}`
        : `${tweets.length} saved`;

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      if (tweets.length === 0) {
        empty.innerHTML =
          '<p>No tweets saved yet.</p><p class="hint">Scroll your home timeline on X to start collecting.</p>';
      } else {
        empty.innerHTML = '<p>No tweets match your search.</p>';
      }
      tweetsContainer.appendChild(empty);
      return;
    }

    filtered.forEach((tweet) => {
      const link = document.createElement('a');
      link.href = tweet.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'tweet-item';

      const meta = document.createElement('div');
      meta.className = 'tweet-meta';

      const author = document.createElement('span');
      author.className = 'tweet-author';
      author.textContent = tweet.author || '(unknown author)';

      meta.appendChild(author);

      if (tweet.timeline?.label) {
        const marker = document.createElement('span');
        marker.className = 'timeline-marker';
        marker.textContent = tweet.timeline.label;
        marker.title = `Saved from ${tweet.timeline.label}`;
        meta.appendChild(marker);
      }

      const content = document.createElement('span');
      content.className = 'tweet-content';
      content.textContent = tweet.content || '(no text)';

      link.appendChild(meta);
      link.appendChild(content);
      tweetsContainer.appendChild(link);
    });
  }

  function loadState() {
    chrome.storage.local.get(
      ['savedTweets', 'maxTweets', 'availableTimelines', 'enabledTimelines'],
      (data) => {
        allTweets = data.savedTweets || [];
        maxTweetsInput.value =
          typeof data.maxTweets === 'number' && data.maxTweets > 0
            ? data.maxTweets
            : DEFAULT_MAX_TWEETS;

        renderTimelineToggles(
          data.availableTimelines || [],
          data.enabledTimelines || {}
        );
        renderTweets(allTweets);
      }
    );
  }

  maxTweetsInput.addEventListener('change', () => {
    const value = parseInt(maxTweetsInput.value, 10);
    if (isNaN(value) || value < 1) {
      loadState();
      return;
    }

    chrome.storage.local.set({ maxTweets: value }, () => {
      chrome.storage.local.get('savedTweets', (data) => {
        let savedTweets = data.savedTweets || [];
        if (savedTweets.length > value) {
          savedTweets = savedTweets.slice(0, value);
          chrome.storage.local.set({ savedTweets }, loadState);
        } else {
          loadState();
        }
      });
    });
  });

  searchInput.addEventListener('input', () => {
    renderTweets(allTweets);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.savedTweets) {
      allTweets = changes.savedTweets.newValue || [];
      renderTweets(allTweets);
    }

    if (changes.availableTimelines || changes.enabledTimelines) {
      chrome.storage.local.get(
        ['availableTimelines', 'enabledTimelines'],
        (data) => {
          renderTimelineToggles(
            data.availableTimelines || [],
            data.enabledTimelines || {}
          );
        }
      );
    }
  });

  loadState();
});