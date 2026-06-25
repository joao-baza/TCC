const HistoryModule = (function () {
    const KEY = 'tcc-calc-history';
    const MAX = 50;

    function getAll() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
    }

    function save(list) {
        localStorage.setItem(KEY, JSON.stringify(list));
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    return {
        add(entry) {
            const list = getAll();
            list.unshift({
                id: String(Date.now()),
                ts: new Date().toISOString(),
                module: entry.module || '—',
                operation: entry.operation || '—',
                inputs: entry.inputs || '',
                summary: entry.summary || '',
            });
            if (list.length > MAX) list.pop();
            save(list);

            // Re-renderiza se o painel estiver visível
            const pane = document.getElementById('history-content');
            if (pane && !pane.classList.contains('hidden')) this.render();
        },

        clear() {
            localStorage.removeItem(KEY);
            this.render();
        },

        render() {
            const container = document.getElementById('history-list');
            if (!container) return;

            const entries = getAll();

            if (entries.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm text-center py-10">Nenhum cálculo realizado ainda.<br>Os resultados aparecem aqui automaticamente.</p>';
                return;
            }

            container.innerHTML = entries.map(e => `
                <div class="history-entry">
                    <div class="history-entry-header">
                        <span class="history-module-badge">${e.module}</span>
                        <span class="history-ts">${formatDate(e.ts)}</span>
                    </div>
                    <div class="history-operation">${e.operation}</div>
                    ${e.inputs ? `<div class="history-inputs">${e.inputs}</div>` : ''}
                    <div class="history-summary">${e.summary}</div>
                </div>
            `).join('');
        },

        init() {
            document.getElementById('clear-history-btn')?.addEventListener('click', () => {
                if (confirm('Limpar todo o histórico de cálculos?')) this.clear();
            });

            document.addEventListener('tcc:calculated', (e) => {
                this.add(e.detail);
            });
        },
    };
})();

window.HistoryModule = HistoryModule;
