/**
 * Main Application JS for Chemical Engineering Calculator
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    UI.setupTabs();
    UI.initializeSelect2();
    
    // Initialize all modules
    if (window.PipingModule) PipingModule.init();
    if (window.SizingModule) SizingModule.init();
    if (window.FlowModule) FlowModule.init();
    if (window.PumpModule) PumpModule.init();
    if (window.ReactorModule) ReactorModule.init();
    if (window.ComponentsModule) ComponentsModule.init();
    
    // Initialize Balance module com um pequeno delay para garantir que os outros módulos estejam carregados
    setTimeout(() => {
        if (window.BalanceModule) BalanceModule.init();
    }, 100);
    
    // Global error handler for API calls
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        UI.showError('Error', event.reason.message || 'An unexpected error occurred');
    });
    
    // Verificação adicional para garantir que a aba Balance funcione corretamente
    setTimeout(() => {
        const balanceTab = document.getElementById('balance-tab');
        if (balanceTab) {
            // Adiciona novamente o event listener
            balanceTab.addEventListener('click', function() {
                // Esconde todas as abas
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.add('hidden');
                    pane.classList.remove('active');
                });
                
                // Mostra a aba de balance
                const balanceContent = document.getElementById('balance-content');
                if (balanceContent) {
                    balanceContent.classList.remove('hidden');
                    balanceContent.classList.add('active');
                }
                
                // Atualiza o estado ativo nas abas
                document.querySelectorAll('[data-tab]').forEach(tab => {
                    tab.classList.remove('active');
                });
                balanceTab.classList.add('active');
            });
        }
    }, 500);
}); 