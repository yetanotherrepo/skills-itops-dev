const search = document.querySelector('#skill-search');
const entries = [...document.querySelectorAll('[data-skill]')];
const count = document.querySelector('#search-count');
const empty = document.querySelector('#search-empty');
function filterSkills() {
  const query = search.value.trim().toLocaleLowerCase('ru');
  let visible = 0;
  for (const entry of entries) {
    const matches = !query || entry.dataset.search.includes(query);
    entry.hidden = !matches;
    if (matches) visible++;
  }
  count.textContent = query ? `Найдено: ${visible}` : '';
  empty.hidden = visible !== 0 || !query;
}
search?.addEventListener('input',filterSkills);
document.querySelector('#reset-search')?.addEventListener('click',() => { search.value=''; filterSkills(); search.focus(); });

const status = document.querySelector('#copy-status');
let statusTimer;
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click',async () => {
    const source = document.getElementById(button.dataset.copy);
    button.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(source.value);
      status.textContent = 'Скопировано. Теперь вставьте текст в чат.';
      status.className = 'copy-status is-visible';
    } catch {
      source.closest('details')?.setAttribute('open','');
      source.focus(); source.select();
      status.textContent = 'Не удалось скопировать автоматически. Текст выделен — скопируйте его вручную.';
      status.className = 'copy-status is-visible is-error';
    } finally {
      button.disabled = false;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => status.classList.remove('is-visible'),8000);
    }
  });
}
const sync = document.querySelector('[data-checked]');
if (sync && Date.now() - Date.parse(sync.dataset.checked) > 24*3600*1000) {
  sync.textContent = 'Обновление зеркала задерживается. Последняя копия остаётся доступна; актуальную версию проверьте на GitHub.';
}
