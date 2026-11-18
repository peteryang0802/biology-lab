'use strict';

function renderTermAudio() {
  return `<div class="term-audio">
    <button type="button" class="text-control" data-term-listen>听题</button>
    <span class="audio-feedback" role="status" data-term-audio-status></span>
  </div>`;
}

function mountTermAudio(host, entry) {
  const button = host.querySelector('[data-term-listen]');
  const message = host.querySelector('[data-term-audio-status]');
  let audio;
  let starting = false;

  function reset() {
    button.textContent = '听题';
    button.removeAttribute('aria-busy');
    message.textContent = '';
    starting = false;
  }

  button.addEventListener('click', async () => {
    if (starting) return;
    if (audio && !audio.paused) {
      audio.pause();
      return;
    }
    if (!audio) {
      audio = new Audio(`./assets/audio/${entry.id}.m4a?v=5`);
      audio.addEventListener('pause', () => {
        if (audio.ended) return;
        button.textContent = '继续朗读';
        message.textContent = '已暂停';
      });
      audio.addEventListener('ended', reset);
    }
    playingPrompt?.pause();
    playingPrompt = audio;
    starting = true;
    button.setAttribute('aria-busy', 'true');
    message.textContent = '正在准备朗读……';
    try {
      await audio.play();
      if (!host.isConnected || playingPrompt !== audio) {
        audio.pause();
        return;
      }
      button.textContent = '暂停朗读';
      message.textContent = '正在朗读';
    } catch {
      if (!host.isConnected) return;
      audio = undefined;
      reset();
      message.textContent = '朗读暂时无法播放。可以再点一次，或阅读题目。';
    } finally {
      starting = false;
      button.removeAttribute('aria-busy');
    }
  });
}
