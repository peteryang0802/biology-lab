'use strict';

const promptAudioVersions = {
  '7b-urine-formation': 6,
  '8a-animal-development': 6,
  '8b-organisms-and-environment': 6,
  photosynthesis: 6,
  'plant-transport': 7,
  '7b-plant-breathing': 6,
  '8b-eco-bottle': 6,
  '8b-ecosystem': 6,
  '8b-first-aid': 6,
  '8b-communicable-disease': 8,
  '8b-classification': 7,
  '8b-algae-and-plants': 7,
  '8b-biosphere': 7,
};

function renderTermAudio() {
  return `<div class="term-audio">
    <button type="button" class="text-control" data-term-listen>听题</button>
    <span class="audio-feedback" role="status" data-term-audio-status></span>
  </div>`;
}

function mountTermAudio(host, entry) {
  mountPromptAudio(host.querySelector('[data-term-listen]'), host.querySelector('[data-term-audio-status]'), entry.id);
}

function mountPromptAudio(button, message, id) {
  const label = button.textContent;
  const audioVersion = promptAudioVersions[id] ?? 5;
  let audio;
  let timeout;

  function clearPending() {
    clearTimeout(timeout);
    timeout = undefined;
    button.removeAttribute('aria-busy');
  }

  function stop(text = '') {
    clearPending();
    if (audio) {
      const previous = audio;
      audio = undefined;
      previous.pause();
      previous.removeAttribute('src');
      previous.load();
    }
    if (playingPrompt === playback) playingPrompt = undefined;
    button.textContent = label;
    message.textContent = text;
  }

  const playback = { stop };
  const unavailable = '朗读暂时无法播放。可以再点一次，或阅读题目。';
  button.addEventListener('click', async () => {
    if (timeout !== undefined) {
      stop();
      return;
    }
    if (audio && !audio.paused) {
      audio.pause();
      button.textContent = '继续朗读';
      message.textContent = '已暂停';
      return;
    }

    if (playingPrompt !== playback) playingPrompt?.stop();
    playingPrompt = playback;
    if (!audio) {
      audio = new Audio(`./assets/audio/${id}.m4a?v=${audioVersion}`);
      const media = audio;
      media.addEventListener('error', () => {
        if (audio === media) stop(unavailable);
      });
      media.addEventListener('ended', () => {
        if (audio === media) stop();
      });
    }
    const media = audio;
    button.textContent = '取消朗读';
    button.setAttribute('aria-busy', 'true');
    message.textContent = '正在准备朗读……';
    timeout = setTimeout(() => stop('朗读加载超时。可以再点一次，或阅读题目。'), 5000);
    try {
      await media.play();
      if (audio !== media) return;
      clearPending();
      button.textContent = '暂停朗读';
      message.textContent = '正在朗读';
    } catch {
      if (audio === media) stop(unavailable);
    }
  });
}
