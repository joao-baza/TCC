const GlossaryModule = (function () {

    const TERMS = [
        // Hidráulica
        { term: 'Número de Reynolds (Re)',    cat: 'Hidráulica', def: 'Adimensional que indica o regime de escoamento: Re < 2300 laminar · 2300–4000 transição · Re > 4000 turbulento. Re = ρVD/μ.' },
        { term: 'Escoamento laminar',          cat: 'Hidráulica', def: 'Re < 2300. Fluido se move em camadas paralelas; perfil de velocidade parabólico. Fator de atrito f = 64/Re.' },
        { term: 'Escoamento turbulento',       cat: 'Hidráulica', def: 'Re > 4000. Mistura intensa; usa correlações empíricas (Colebrook-White, Moody) para obter f.' },
        { term: 'Fator de atrito de Darcy (f)',cat: 'Hidráulica', def: 'Coeficiente adimensional da equação Darcy-Weisbach. f_lam = 64/Re; f_turb via Colebrook-White: 1/√f = −2 log(ε/3.7D + 2.51/(Re·√f)).' },
        { term: 'Rugosidade relativa (ε/D)',   cat: 'Hidráulica', def: 'Razão entre a rugosidade superficial ε (m) e o diâmetro interno D (m). Influencia o fator de atrito no regime turbulento.' },
        { term: 'Perda de carga (h_L)',        cat: 'Hidráulica', def: 'Perda de energia por atrito expressa em metros de coluna de fluido. h_L = f·(L/D)·V²/(2g)  (Darcy-Weisbach).' },
        { term: 'Diâmetro hidráulico (D_h)',   cat: 'Hidráulica', def: 'Diâmetro equivalente para seções não circulares: D_h = 4·A/P, onde A é a área transversal e P o perímetro molhado.' },
        { term: 'Swamee-Jain',                 cat: 'Hidráulica', def: 'Aproximação explícita do fator de atrito: f = 0,25 / [log(ε/3,7D + 5,74/Re⁰·⁹)]². Evita iteração.' },
        // Dimensionamento
        { term: 'Schedule (ASME)',             cat: 'Dimensionamento', def: 'Norma para espessura de parede de tubo metálico (ex: Sch 40, Sch 80). Maior número → parede mais espessa → diâmetro interno menor.' },
        { term: 'DN / NPS',                    cat: 'Dimensionamento', def: 'Diâmetro Nominal (DN em mm / NPS em polegadas). É um designador comercial — o diâmetro real depende do schedule.' },
        { term: 'Equação da continuidade',     cat: 'Dimensionamento', def: 'Para escoamento incompressível em seção circular: Q = V·π·D²/4 → D = √(4Q/πV).' },
        // Bombas
        { term: 'NPSH Disponível (NPSHd)',     cat: 'Bombas', def: 'Altura de pressão de sucção disponível para a bomba (m). Deve ser maior que o NPSH requerido para evitar cavitação.' },
        { term: 'NPSH Requerido (NPSHr)',      cat: 'Bombas', def: 'Valor mínimo de NPSH exigido pelo fabricante. Obtido por ensaio. Se NPSHd < NPSHr → cavitação.' },
        { term: 'Cavitação',                   cat: 'Bombas', def: 'Formação e implosão de bolhas de vapor no interior da bomba. Causa vibração, ruído, erosão e queda de desempenho.' },
        { term: 'Head da bomba (H)',           cat: 'Bombas', def: 'Energia por peso unitário de fluido fornecida pela bomba (m). Equação de Bernoulli generalizada: H = ΔP/ρg + Δz + ΔV²/2g + h_L.' },
        { term: 'Perda de carga singular',     cat: 'Bombas', def: 'Perda localizada em válvulas, curvas e outros acessórios. h_s = K·V²/2g, onde K é o coeficiente de perda da conexão.' },
        // Reatores
        { term: 'CSTR',                        cat: 'Reatores', def: 'Continuous Stirred-Tank Reactor. Mistura perfeita → composição uniforme = saída. Equação de projeto: V = F_A0·X/(−r_A).' },
        { term: 'PFR',                         cat: 'Reatores', def: 'Plug Flow Reactor. Escoamento pistonado → concentrações variam ao longo do comprimento. V = F_A0·∫dX/(−r_A).' },
        { term: 'Conversão (X)',               cat: 'Reatores', def: 'Fração do reagente limitante que foi consumida: X = (F_A0 − F_A)/F_A0. Valor entre 0 e 1.' },
        { term: 'Constante de velocidade (k)', cat: 'Reatores', def: 'Parâmetro cinético dependente da temperatura (Arrhenius: k = A·e^(−Ea/RT)). Unidade depende da ordem da reação.' },
        { term: 'Lei de velocidade de potência', cat: 'Reatores', def: '−r_A = k · C_A^α · C_B^β · … A ordem global é α + β + …. Válida para reações elementares ou com mecanismo definido.' },
        { term: 'Reagente limitante',           cat: 'Reatores', def: 'Componente que se esgota primeiro. Determina a conversão máxima e é usado como referência no balanço molar.' },
        // Componentes
        { term: 'CoolProp',                    cat: 'Componentes', def: 'Biblioteca termodinâmica open-source com equações de estado de alta precisão para ~120 fluidos puros e misturas.' },
        { term: 'Temperatura crítica (T_c)',    cat: 'Componentes', def: 'Temperatura acima da qual a distinção entre fase líquida e vapor deixa de existir. Acima de T_c o fluido é supercrítico.' },
        { term: 'Pressão crítica (P_c)',        cat: 'Componentes', def: 'Pressão correspondente ao ponto crítico. Junto com T_c define o estado termodinâmico crítico.' },
        { term: 'Viscosidade dinâmica (μ)',     cat: 'Componentes', def: 'Medida da resistência do fluido ao cisalhamento (Pa·s ou cP). Varia fortemente com a temperatura.' },
        { term: 'Viscosidade cinemática (ν)',   cat: 'Componentes', def: 'ν = μ/ρ (m²/s ou cSt). Relevante para cálculo de Reynolds quando a densidade é conhecida.' },
        // Balanço
        { term: 'Corrente de processo',        cat: 'Balanço', def: 'Fluxo de material entre unidades. direction = 1 → entrada; direction = −1 → saída.' },
        { term: 'Fração molar / mássica',      cat: 'Balanço', def: 'Composição normalizada da corrente: soma das frações = 1,0. Molar quando vazão é em mol/tempo; mássica quando em massa/tempo.' },
        { term: 'Reciclo (split)',              cat: 'Balanço', def: 'Retorno de parte da corrente de saída para a entrada. Aumenta a conversão global mas exige mais energia de bombeamento.' },
        { term: 'Purga',                       cat: 'Balanço', def: 'Remoção de fração do reciclo para evitar acúmulo de inertes ou subprodutos no sistema.' },
        { term: 'Coeficiente estequiométrico', cat: 'Balanço', def: 'Indica proporção de consumo/produção na reação. Negativo para reagentes; positivo para produtos. Escala relativa.' },
    ];

    let _rendered = false;

    function buildHTML() {
        const cats = [...new Set(TERMS.map(t => t.cat))];
        return `
            <input id="glossary-search" type="search"
                   placeholder="Pesquisar termo…"
                   class="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                   aria-label="Pesquisar no glossário">
            ${cats.map(cat => `
                <div class="glossary-section">
                    <div class="glossary-cat-label">${cat}</div>
                    ${TERMS.filter(t => t.cat === cat).map(t => `
                        <div class="glossary-term" data-cat="${cat}">
                            <dt class="glossary-dt">${t.term}</dt>
                            <dd class="glossary-dd">${t.def}</dd>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `;
    }

    return {
        render() {
            const panel = document.getElementById('glossary-panel');
            if (!panel) return;
            if (!_rendered) {
                panel.innerHTML = buildHTML();
                _rendered = true;
                this._setupSearch();
            }
        },

        _setupSearch() {
            const input = document.getElementById('glossary-search');
            if (!input) return;
            let timer;
            input.addEventListener('input', () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    const q = input.value.toLowerCase().trim();
                    document.querySelectorAll('.glossary-term').forEach(el => {
                        const match = !q || el.textContent.toLowerCase().includes(q);
                        el.classList.toggle('hidden', !match);
                    });
                    document.querySelectorAll('.glossary-section').forEach(sec => {
                        const anyVisible = [...sec.querySelectorAll('.glossary-term')]
                            .some(el => !el.classList.contains('hidden'));
                        sec.classList.toggle('hidden', !anyVisible);
                    });
                }, 150);
            });
        },

        init() { this.render(); },
    };
})();

window.GlossaryModule = GlossaryModule;
