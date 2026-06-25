document.addEventListener('DOMContentLoaded', function () {
    // Configura sidebar com navegação, lazy-load por módulo e hash routing
    UI.setupSidebar();

    // Select2 nos selects já visíveis (home screen não tem selects)
    UI.initializeSelect2();

    // Modo aula: acordeões, "Carregar exemplo" e validação inline
    if (window.DidaticModule) DidaticModule.init();

    // Handler global de erros de API
    window.addEventListener('unhandledrejection', function (event) {
        console.error('Unhandled promise rejection:', event.reason);
        UI.showError('Erro', (event.reason && event.reason.message) || 'Ocorreu um erro inesperado');
    });
});
