const GlossaryModule = (function () {

    const TERMS = [
        // ── Hidráulica ──────────────────────────────────────────────────────────
        {
            term: 'Número de Reynolds (Re)',
            cat: 'Hidráulica',
            def: 'Adimensional que relaciona forças inerciais e viscosas: \\\(Re = \\dfrac{\\rho V D}{\\mu} = \\dfrac{V D}{\\nu}\\\). '
               + 'Re &lt; 2300 → laminar · 2300–4000 → transição · Re &gt; 4000 → turbulento.',
        },
        {
            term: 'Escoamento laminar',
            cat: 'Hidráulica',
            def: 'Re &lt; 2300. Fluido move-se em camadas paralelas; perfil de velocidade parabólico. '
               + 'Fator de atrito analítico: \\\(f = 64/Re\\\).',
        },
        {
            term: 'Escoamento turbulento',
            cat: 'Hidráulica',
            def: 'Re &gt; 4000. Mistura intensa; \\\(f\\\) depende de Re e da rugosidade relativa \\\(\\varepsilon/D\\\). '
               + 'Usa-se Colebrook-White, Haaland ou Swamee-Jain.',
        },
        {
            term: 'Fator de atrito de Darcy (f)',
            cat: 'Hidráulica',
            def: 'Coeficiente adimensional de Darcy-Weisbach. Laminar: \\\(f = 64/Re\\\). '
               + 'Turbulento: obtido por Colebrook-White (implícita), Haaland ou Swamee-Jain (explícitas). '
               + 'No regime de transição (2300–4000) não há correlação universal.',
        },
        {
            term: 'Rugosidade relativa (ε/D)',
            cat: 'Hidráulica',
            def: 'Razão entre rugosidade absoluta \\\(\\varepsilon\\\) (m) e diâmetro interno \\\(D\\\) (m). '
               + 'Influencia \\\(f\\\) no regime turbulento conforme o diagrama de Moody.',
        },
        {
            term: 'Perda de carga distribuída (h_f)',
            cat: 'Hidráulica',
            def: 'Perda de energia por atrito ao longo da tubulação, em metros de coluna de fluido: '
               + '\\\[h_f = f \\cdot \\frac{L + \\sum L_{eq}}{D} \\cdot \\frac{V^2}{2g}\\\] '
               + '\\\(\\sum L_{eq}\\\) é o comprimento equivalente total dos acessórios.',
        },
        {
            term: 'Diâmetro hidráulico (D_h)',
            cat: 'Hidráulica',
            def: 'Diâmetro equivalente para seções não circulares: \\\(D_h = 4A/P\\\), onde \\\(A\\\) é a área '
               + 'transversal e \\\(P\\\) o perímetro molhado. Para dutos circulares, \\\(D_h = D\\\).',
        },
        {
            term: 'Swamee-Jain',
            cat: 'Hidráulica',
            def: 'Aproximação explícita do fator de atrito turbulento: '
               + '\\\[f = \\frac{0{,}25}{\\left[\\log\\!\\left(\\dfrac{\\varepsilon}{3{,}7D} + \\dfrac{5{,}74}{Re^{0{,}9}}\\right)\\right]^2}\\\] '
               + 'Erro &lt; 3 % em relação à Colebrook-White. Evita iteração.',
        },
        {
            term: 'Colebrook-White',
            cat: 'Hidráulica',
            def: 'Equação implícita para \\\(f\\\) em regime turbulento: '
               + '\\\[\\frac{1}{\\sqrt{f}} = -2\\log\\!\\left(\\frac{\\varepsilon}{3{,}7D} + \\frac{2{,}51}{Re\\sqrt{f}}\\right)\\\] '
               + 'Base do diagrama de Moody. Resolvida iterativamente ou substituída por Swamee-Jain/Haaland.',
        },
        {
            term: 'Haaland',
            cat: 'Hidráulica',
            def: 'Correlação explícita alternativa à Colebrook-White: '
               + '\\\[\\frac{1}{\\sqrt{f}} = -1{,}8\\log\\!\\left[\\left(\\frac{\\varepsilon/D}{3{,}7}\\right)^{1{,}11} + \\frac{6{,}9}{Re}\\right]\\\] '
               + 'Erro &lt; 2 % para Re &gt; 4000.',
        },
        {
            term: 'Hazen-Williams',
            cat: 'Hidráulica',
            def: 'Fórmula empírica para água em regime turbulento desenvolvido (\\\(D > 50\\\) mm): '
               + '\\\[h_f = \\frac{4{,}73\\,L}{C^{1{,}852}\\,D^{4{,}87}}\\,Q^{1{,}852}\\\] '
               + 'C é o coeficiente adimensional tabelado por material (PVC ≈ 150, ferro fundido ≈ 100).',
        },
        {
            term: 'Comprimento equivalente (L_eq)',
            cat: 'Hidráulica',
            def: 'Perda localizada de acessórios (curvas, válvulas, expansões) expressa como tubo reto: '
               + '\\\(L_{tot} = L_{reta} + \\sum L_{eq}\\\). '
               + 'Permite usar Darcy-Weisbach para toda a linha. Valores de \\\(L_{eq}/D\\\) tabelados por tipo de acessório.',
        },
        {
            term: 'Altura manométrica (H)',
            cat: 'Hidráulica',
            def: 'Bernoulli estendida entre dois pontos de uma linha: '
               + '\\\[H = \\frac{P_2 - P_1}{\\rho g} + \\frac{V_2^2 - V_1^2}{2g} + (z_2 - z_1) + h_f\\\] '
               + 'H &gt; 0 → bomba necessária; H &lt; 0 → energia extraída (turbina).',
        },
        {
            term: 'Diagrama de Moody',
            cat: 'Hidráulica',
            def: 'Gráfico log-log do fator de atrito de Darcy \\\(f\\\) em função de \\\(Re\\\) e da rugosidade relativa \\\(\\varepsilon/D\\\). '
               + 'Organizado em três regiões: laminar (\\\(f = 64/Re\\\)), transição e turbulento. '
               + 'No regime turbulento plenamente rugoso (altas \\\(Re\\\)), \\\(f\\\) depende apenas de \\\(\\varepsilon/D\\\). '
               + 'Construído a partir da equação de Colebrook-White; o ponto operacional é plotado sobre ele para leitura visual do regime.',
        },

        // ── Dimensionamento ─────────────────────────────────────────────────────
        {
            term: 'Equação da continuidade',
            cat: 'Dimensionamento',
            def: 'Para escoamento incompressível em seção circular: '
               + '\\\(Q = V \\cdot \\pi D^2/4\\\) → \\\(D = \\sqrt{4Q/(\\pi V)}\\\).',
        },
        {
            term: 'Schedule (ASME)',
            cat: 'Dimensionamento',
            def: 'Norma para espessura de parede de tubo metálico (ex: Sch 40, Sch 80). '
               + 'Maior número → parede mais espessa → diâmetro interno menor.',
        },
        {
            term: 'DN / NPS',
            cat: 'Dimensionamento',
            def: 'Diâmetro Nominal (DN em mm / NPS em polegadas). É um designador comercial — '
               + 'o diâmetro interno real depende do schedule e do material.',
        },

        // ── Bombas ──────────────────────────────────────────────────────────────
        {
            term: 'NPSH Disponível (NPSHd)',
            cat: 'Bombas',
            def: 'Altura de pressão de sucção disponível para a bomba: '
               + '\\\[NPSHd = \\frac{P_{suc} + P_{atm} - p_{vap}}{\\rho g} + \\frac{V_{suc}^2}{2g} + (z_{suc} - z_0) - h_{suc}\\\] '
               + 'Deve ser maior que o NPSHr para evitar cavitação.',
        },
        {
            term: 'NPSH Requerido (NPSHr)',
            cat: 'Bombas',
            def: 'Valor mínimo de NPSH exigido pelo fabricante, obtido por ensaio. '
               + 'Se NPSHd &lt; NPSHr → cavitação.',
        },
        {
            term: 'Cavitação',
            cat: 'Bombas',
            def: 'Formação e implosão de bolhas de vapor no interior da bomba quando a pressão local cai abaixo de \\\(p_{vap}\\\). '
               + 'Causa vibração, ruído, erosão e queda de desempenho.',
        },
        {
            term: 'Head da bomba (H)',
            cat: 'Bombas',
            def: 'Energia por peso unitário de fluido fornecida pela bomba (m). '
               + 'Obtido pela equação de Bernoulli estendida: \\\(H = \\Delta P/(\\rho g) + \\Delta z + \\Delta V^2/(2g) + h_f\\\).',
        },
        {
            term: 'Perda de carga singular',
            cat: 'Bombas',
            def: 'Perda localizada em acessórios: \\\(h_s = K \\cdot V^2/(2g)\\\), onde \\\(K\\\) é o coeficiente de perda da conexão.',
        },
        {
            term: 'Pressão de vapor (p_vap)',
            cat: 'Bombas',
            def: 'Pressão na qual o líquido entra em ebulição à temperatura de operação. '
               + 'Quanto maior \\\(p_{vap}\\\), menor a margem de NPSHd disponível. '
               + 'Obtida pela equação de Antoine ou por biblioteca termodinâmica (CoolProp).',
        },
        {
            term: 'Potência hidráulica',
            cat: 'Bombas',
            def: 'Potência útil fornecida ao fluido: '
               + '\\\[P = \\frac{\\rho\\,g\\,Q\\,H}{\\eta}\\\] '
               + '\\\(\\eta\\\) é a eficiência total (produto das eficiências hidráulica, volumétrica e mecânica).',
        },

        // ── Reatores ────────────────────────────────────────────────────────────
        {
            term: 'CSTR',
            cat: 'Reatores',
            def: 'Continuous Stirred-Tank Reactor. Mistura perfeita → composição uniforme = saída. '
               + 'Equação de projeto: \\\[V = \\frac{F_{A0}\\,X}{-r_A}\\\] '
               + 'Tempo de residência: \\\(\\tau = V/Q_T\\\). A taxa \\\(r_A\\\) é avaliada nas condições de saída.',
        },
        {
            term: 'PFR',
            cat: 'Reatores',
            def: 'Plug Flow Reactor. Escoamento pistonado → concentrações variam ao longo do comprimento; sem mistura axial. '
               + 'Equação de projeto: \\\[V = F_{A0}\\int_0^X \\frac{dX}{-r_A}\\\] '
               + 'Cada elemento de fluido comporta-se como um reator batelada em movimento.',
        },
        {
            term: 'Conversão (X)',
            cat: 'Reatores',
            def: 'Fração do reagente limitante consumida: '
               + '\\\(X = (F_{A0} - F_A)/F_{A0}\\\). Valor entre 0 e 1.',
        },
        {
            term: 'Constante de velocidade (k)',
            cat: 'Reatores',
            def: 'Parâmetro cinético com dependência de temperatura via Arrhenius: '
               + '\\\[k = A\\,e^{-E_a/(RT)}\\\] '
               + '\\\(A\\\) = fator pré-exponencial; \\\(E_a\\\) = energia de ativação (J/mol). '
               + 'Unidade depende da ordem global da reação.',
        },
        {
            term: 'Lei de velocidade de potência',
            cat: 'Reatores',
            def: '\\\(-r_A = k \\cdot C_A^\\alpha \\cdot C_B^\\beta \\cdots\\\) '
               + 'A ordem global é \\\(\\alpha + \\beta + \\cdots\\\). '
               + 'Válida para reações elementares ou com mecanismo definido.',
        },
        {
            term: 'Reagente limitante',
            cat: 'Reatores',
            def: 'Componente que se esgota primeiro; determina a conversão máxima. '
               + 'Identificado pelo menor valor de \\\(F_{i0}/|n_i|\\\) entre os reagentes.',
        },
        {
            term: 'Tempo de residência (τ)',
            cat: 'Reatores',
            def: 'Tempo médio que o fluido permanece no reator: \\\(\\tau = V/Q_T\\\). '
               + 'Para CSTR isotérmico relaciona-se com a equação de projeto: '
               + '\\\(\\tau = C_{A0}\\,X/(-r_A)\\\).',
        },
        {
            term: 'Equação de Arrhenius',
            cat: 'Reatores',
            def: 'Dependência de \\\(k\\\) com a temperatura: '
               + '\\\[k = A\\,e^{-E_a/(RT)}\\\] '
               + '\\\(R\\\) = 8,314 J/(mol·K). Linearizável como \\\(\\ln k = \\ln A - E_a/RT\\\).',
        },
        {
            term: 'Coef. de expansão volumétrico (ε)',
            cat: 'Reatores',
            def: 'Variação fracionária do volume para conversão completa do reagente limitante em fase gasosa: '
               + '\\\[\\varepsilon = y_{A0}\\,\\frac{\\sum n_P - \\sum n_R}{|n_A|}\\\] '
               + '\\\(\\varepsilon = 0\\\) para líquidos ou reações sem variação de mols gasosos.',
        },
        {
            term: 'Fator de diluição (ψ)',
            cat: 'Reatores',
            def: 'Corrige a vazão volumétrica em reações gasosas com variação de mols, pressão e temperatura: '
               + '\\\[\\psi = (1 + \\varepsilon\\,X)\\,\\frac{P}{P_0}\\,\\frac{T_0}{T}\\\] '
               + 'Usado para calcular concentrações de saída a partir de \\\(X\\\).',
        },
        {
            term: 'Método de Brent',
            cat: 'Reatores',
            def: 'Algoritmo numérico para encontrar raízes de funções escalares em um intervalo \\\([a, b]\\\) onde \\\(f(a) \\cdot f(b) < 0\\\). '
               + 'Combina bissecção (garante convergência), secante e interpolação quadrática inversa (aceleração). '
               + 'Usado no CSTR e PFR quando o volume \\\(V\\\) ou o tempo de residência \\\(\\tau\\\) são dados e a conversão \\\(X\\\) é a incógnita — a equação de design é implícita em \\\(X\\\).',
        },

        // ── Componentes ─────────────────────────────────────────────────────────
        {
            term: 'CoolProp',
            cat: 'Componentes',
            def: 'Biblioteca termodinâmica open-source com equações de estado de alta precisão para ~120 fluidos puros e misturas.',
        },
        {
            term: 'Temperatura crítica (T_c)',
            cat: 'Componentes',
            def: 'Temperatura acima da qual a distinção entre fase líquida e vapor deixa de existir. '
               + 'Acima de \\\(T_c\\\) o fluido é supercrítico.',
        },
        {
            term: 'Pressão crítica (P_c)',
            cat: 'Componentes',
            def: 'Pressão correspondente ao ponto crítico. Junto com \\\(T_c\\\) define o estado termodinâmico crítico.',
        },
        {
            term: 'Viscosidade dinâmica (μ)',
            cat: 'Componentes',
            def: 'Medida da resistência do fluido ao cisalhamento (Pa·s ou cP). Varia fortemente com a temperatura.',
        },
        {
            term: 'Viscosidade cinemática (ν)',
            cat: 'Componentes',
            def: '\\\(\\nu = \\mu/\\rho\\\) (m²/s ou cSt). Relevante para cálculo de Reynolds quando a densidade é conhecida.',
        },
        {
            term: 'Equação de Antoine',
            cat: 'Componentes',
            def: 'Correlação empírica para pressão de vapor em função da temperatura: '
               + '\\\[\\log_{10} P_{vap} = A - \\frac{B}{C + T}\\\] '
               + 'A, B, C são constantes tabeladas por composto e faixa de temperatura. '
               + 'Fundamental para cálculo de NPSHd e flash.',
        },
        {
            term: 'Equação de estado',
            cat: 'Componentes',
            def: 'Relação entre \\\(P\\\), \\\(V\\\) e \\\(T\\\) de um fluido. '
               + 'Gás ideal: \\\(PV = nRT\\\). '
               + 'Para sistemas reais, equações cúbicas (Peng-Robinson, SRK) adicionam termos de atração/repulsão molecular.',
        },
        {
            term: 'Calor específico (c_p / c_v)',
            cat: 'Componentes',
            def: 'Energia necessária para elevar 1 kg de substância em 1 K. '
               + '\\\(c_p\\\) a pressão constante (J/kg·K); \\\(c_v\\\) a volume constante. '
               + 'Para gases ideais: \\\(c_p - c_v = R/M\\\). '
               + 'Obtido via CoolProp a partir de T e P; alimenta balanços de energia e dimensionamento de trocadores.',
        },
        {
            term: 'Entalpia específica (h)',
            cat: 'Componentes',
            def: 'Função de estado definida como \\\(h = u + Pv\\\), onde \\\(u\\\) é a energia interna, \\\(P\\\) a pressão e \\\(v\\\) o volume específico (m³/kg). '
               + 'Unidade: J/kg. Variação de entalpia \\\(\\Delta h\\\) é a troca de calor em processos a pressão constante. '
               + 'Fundamental em balanços de energia de trocadores, evaporadores e condensadores.',
        },
        {
            term: 'Entropia específica (s)',
            cat: 'Componentes',
            def: 'Medida da desordem do sistema por unidade de massa (J/kg·K). '
               + 'Em processos reversíveis adiabáticos, \\\(\\Delta s = 0\\\) (isentrópico). '
               + 'Obtida via CoolProp; usada para análise de eficiência de compressores e turbinas.',
        },
        {
            term: 'Condutividade térmica (λ)',
            cat: 'Componentes',
            def: 'Capacidade do material de conduzir calor (W/m·K). Governa a lei de Fourier: '
               + '\\\(\\dot{q} = -\\lambda \\nabla T\\\). '
               + 'Varia com temperatura e fase; obtida via CoolProp. '
               + 'Insumo para cálculo de coeficientes de troca térmica em trocadores e isolamentos.',
        },
        {
            term: 'Ponto de bolha / Ponto de orvalho',
            cat: 'Componentes',
            def: '<strong>Ponto de bolha</strong>: temperatura (ou pressão) na qual a primeira bolha de vapor se forma ao aquecer um líquido a pressão constante. '
               + '<strong>Ponto de orvalho</strong>: temperatura (ou pressão) na qual a primeira gota de líquido se condensa ao resfriar um vapor. '
               + 'Em misturas, bolha e orvalho diferem (envelope bifásico). '
               + 'Obtidos via CoolProp; relevantes para verificar fase do fluido nas condições de operação.',
        },

        // ── Balanço ─────────────────────────────────────────────────────────────
        {
            term: 'Corrente de processo',
            cat: 'Balanço',
            def: 'Fluxo de material entre unidades. direction = 1 → entrada; direction = −1 → saída.',
        },
        {
            term: 'Fração molar / mássica',
            cat: 'Balanço',
            def: 'Composição normalizada da corrente: soma das frações = 1,0. '
               + 'Molar quando vazão é em mol/tempo; mássica quando em massa/tempo.',
        },
        {
            term: 'Reciclo (split)',
            cat: 'Balanço',
            def: 'Retorno de parte da corrente de saída para a entrada. '
               + '\\\(F_R = f \\cdot F_P\\\); aumenta a conversão global mas exige mais energia de bombeamento.',
        },
        {
            term: 'Purga',
            cat: 'Balanço',
            def: 'Remoção de fração do reciclo para evitar acúmulo de inertes ou subprodutos: '
               + '\\\(F_G = (1 - f) \\cdot F_P\\\).',
        },
        {
            term: 'Coeficiente estequiométrico',
            cat: 'Balanço',
            def: 'Indica proporção de consumo/produção na reação. '
               + 'Negativo para reagentes; positivo para produtos. Escala relativa.',
        },
        {
            term: 'Estado estacionário',
            cat: 'Balanço',
            def: 'Condição em que não há acúmulo de massa no sistema (acúmulo = 0): '
               + '\\\[\\sum \\dot{m}_{entrada} = \\sum \\dot{m}_{saída}\\\] '
               + 'Com reação, inclui termos de geração/consumo estequiométricos por componente.',
        },
        {
            term: 'Vazão molar (F_i)',
            cat: 'Balanço',
            def: 'Quantidade molar de componente \\\(i\\\) por unidade de tempo: \\\(F_i = C_i \\cdot Q_i\\\) (mol/s). '
               + '\\\(F_{A0}\\\) é a vazão molar do reagente limitante na entrada do reator.',
        },
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
            this._renderMath();
        },

        _renderMath() {
            const panel = document.getElementById('glossary-panel');
            if (!panel || !window.renderMathInElement) return;
            renderMathInElement(panel, {
                delimiters: [
                    { left: '\\[', right: '\\]', display: true  },
                    { left: '\\(', right: '\\)', display: false },
                ],
                throwOnError: false,
            });
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
