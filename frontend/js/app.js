/**
 * Main Application JS for Chemical Engineering Calculator
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize UI
    UI.setupTabs();
    UI.initializeSelect2();

    // Initialize all modules (synchronous; scripts already loaded above)
    if (window.PipingModule) PipingModule.init();
    if (window.SizingModule) SizingModule.init();
    if (window.FlowModule) FlowModule.init();
    if (window.PumpModule) PumpModule.init();
    if (window.ReactorModule) ReactorModule.init();
    if (window.ComponentsModule) ComponentsModule.init();
    if (window.BalanceModule) BalanceModule.init();

    // Global error handler for API calls
    window.addEventListener('unhandledrejection', function (event) {
        console.error('Unhandled promise rejection:', event.reason);
        UI.showError('Erro', (event.reason && event.reason.message) || 'Ocorreu um erro inesperado');
    });
});
