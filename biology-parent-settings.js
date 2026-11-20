import { mountParentSettings } from './parent-settings.js?v=1';

const isDirectory = () => ['', '#/', '#lesson', '#directory'].includes(location.hash)
  || /^#\/term\/(7a|7b|8a|8b)$/.test(location.hash);

mountParentSettings({
  subject: 'biology',
  label: '生物',
  entry: document.querySelector('#biology-parent-entry'),
  visible: isDirectory,
  localKeys: ['bio-learning-lab:v1'],
  localPrefixes: ['bio-learning-lab:v1:pending:'],
  onReload() {
    history.replaceState(null, '', isDirectory() ? location.href : '#/');
    location.reload();
  },
});
