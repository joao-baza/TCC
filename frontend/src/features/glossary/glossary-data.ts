export type GlossaryEntry = {
  term: string;
  category: string;
  definition: string;
};

export const glossaryEntries: GlossaryEntry[] = [
  {
    term: "Número de Reynolds (Re)",
    category: "Hidráulica",
    definition:
      "Adimensional que relaciona forças inerciais e viscosas: \\(Re = \\dfrac{\\rho V D}{\\mu} = \\dfrac{V D}{\\nu}\\). Re &lt; 2300 → laminar · 2300–4000 → transição · Re &gt; 4000 → turbulento.",
  },
  {
    term: "Escoamento laminar",
    category: "Hidráulica",
    definition:
      "Re &lt; 2300. Fluido move-se em camadas paralelas; perfil de velocidade parabólico. Fator de atrito analítico: \\(f = 64/Re\\).",
  },
  {
    term: "Escoamento turbulento",
    category: "Hidráulica",
    definition:
      "Re &gt; 4000. Mistura intensa; \\(f\\) depende de Re e da rugosidade relativa \\(\\varepsilon/D\\). Usa-se Colebrook-White, Haaland ou Swamee-Jain.",
  },
  {
    term: "Fator de atrito de Darcy (f)",
    category: "Hidráulica",
    definition:
      "Coeficiente adimensional de Darcy-Weisbach. Laminar: \\(f = 64/Re\\). Turbulento: obtido por Colebrook-White (implícita), Haaland ou Swamee-Jain (explícitas). No regime de transição (2300–4000) não há correlação universal.",
  },
  {
    term: "Rugosidade relativa (ε/D)",
    category: "Hidráulica",
    definition:
      "Razão entre rugosidade absoluta \\(\\varepsilon\\) (m) e diâmetro interno \\(D\\) (m). Influencia \\(f\\) no regime turbulento conforme o diagrama de Moody.",
  },
  {
    term: "Perda de carga distribuída (h_f)",
    category: "Hidráulica",
    definition:
      "Perda de energia por atrito ao longo da tubulação, em metros de coluna de fluido: \\[h_f = f \\cdot \\frac{L + \\sum L_{eq}}{D} \\cdot \\frac{V^2}{2g}\\] \\(\\sum L_{eq}\\) é o comprimento equivalente total dos acessórios.",
  },
  {
    term: "Curva de perda de carga",
    category: "Hidráulica",
    definition:
      "Curva que relaciona a perda de carga total com a vazão do sistema. Em tubulações reais cresce rapidamente com o aumento da vazão, normalmente com comportamento aproximadamente quadrático.",
  },
  {
    term: "Diâmetro hidráulico (D_h)",
    category: "Hidráulica",
    definition:
      "Diâmetro equivalente para seções não circulares: \\(D_h = 4A/P\\), onde \\(A\\) é a área transversal e \\(P\\) o perímetro molhado. Para dutos circulares, \\(D_h = D\\).",
  },
  {
    term: "Swamee-Jain",
    category: "Hidráulica",
    definition:
      "Aproximação explícita do fator de atrito turbulento: \\[f = \\frac{0{,}25}{\\left[\\log\\!\\left(\\dfrac{\\varepsilon}{3{,}7D} + \\dfrac{5{,}74}{Re^{0{,}9}}\\right)\\right]^2}\\] Erro &lt; 3 % em relação à Colebrook-White. Evita iteração.",
  },
  {
    term: "Colebrook-White",
    category: "Hidráulica",
    definition:
      "Equação implícita para \\(f\\) em regime turbulento: \\[\\frac{1}{\\sqrt{f}} = -2\\log\\!\\left(\\frac{\\varepsilon}{3{,}7D} + \\frac{2{,}51}{Re\\sqrt{f}}\\right)\\] Base do diagrama de Moody. Resolvida iterativamente ou substituída por Swamee-Jain/Haaland.",
  },
  {
    term: "Haaland",
    category: "Hidráulica",
    definition:
      "Correlação explícita alternativa à Colebrook-White: \\[\\frac{1}{\\sqrt{f}} = -1{,}8\\log\\!\\left[\\left(\\frac{\\varepsilon/D}{3{,}7}\\right)^{1{,}11} + \\frac{6{,}9}{Re}\\right]\\] Erro &lt; 2 % para Re &gt; 4000.",
  },
  {
    term: "Hazen-Williams",
    category: "Hidráulica",
    definition:
      "Fórmula empírica para água em regime turbulento desenvolvido (\\(D > 50\\) mm): \\[h_f = \\frac{10{,}646\\,L}{C^{1{,}852}\\,D^{4{,}87}}\\,Q^{1{,}852}\\] C é o coeficiente adimensional tabelado por material (PVC ≈ 150, ferro fundido ≈ 100).",
  },
  {
    term: "Comprimento equivalente (L_eq)",
    category: "Hidráulica",
    definition:
      "Perda localizada de acessórios (curvas, válvulas, expansões) expressa como tubulação reta: \\(L_{tot} = L_{reta} + \\sum L_{eq}\\). Permite usar Darcy-Weisbach para toda a tubulação. Valores de \\(L_{eq}/D\\) tabelados por tipo de acessório.",
  },
  {
    term: "Altura manométrica (H)",
    category: "Hidráulica",
    definition:
      "Bernoulli estendida entre dois pontos da tubulação: \\[H = \\frac{P_2 - P_1}{\\rho g} + \\frac{V_2^2 - V_1^2}{2g} + (z_2 - z_1) + h_f\\] H &gt; 0 → bomba necessária; H &lt; 0 → energia extraída (turbina).",
  },
  {
    term: "Diagrama de Moody",
    category: "Hidráulica",
    definition:
      "Gráfico log-log do fator de atrito de Darcy \\(f\\) em função de \\(Re\\) e da rugosidade relativa \\(\\varepsilon/D\\). Organizado em três regiões: laminar (\\(f = 64/Re\\)), transição e turbulento. No regime turbulento plenamente rugoso (altas \\(Re\\)), \\(f\\) depende apenas de \\(\\varepsilon/D\\). Construído a partir da equação de Colebrook-White; o ponto operacional é plotado sobre ele para leitura visual do regime.",
  },
  {
    term: "Equação da continuidade",
    category: "Dimensionamento",
    definition:
      "Para escoamento incompressível em seção circular: \\(Q = V \\cdot \\pi D^2/4\\) → \\(D = \\sqrt{4Q/(\\pi V)}\\).",
  },
  {
    term: "<em>Schedule</em> (ASME)",
    category: "Dimensionamento",
    definition:
      "Norma para espessura de parede de tubulação metálica (ex: Sch 40, Sch 80). Maior número → parede mais espessa → diâmetro interno menor.",
  },
  {
    term: "DN / NPS",
    category: "Dimensionamento",
    definition:
      "Diâmetro Nominal (DN em mm / NPS em polegadas). É um designador comercial - o diâmetro interno real depende do schedule e do material.",
  },
  {
    term: "NPSH Disponível (NPSHd)",
    category: "Bombas",
    definition:
      "Altura de pressão de sucção disponível para a bomba: \\[NPSHd = \\frac{P_{suc} + P_{atm} - p_{vap}}{\\rho g} + \\frac{V_{suc}^2}{2g} + (z_{suc} - z_0) - h_{suc}\\] Deve ser maior que o NPSHr para evitar cavitação.",
  },
  {
    term: "NPSH Requerido (NPSHr)",
    category: "Bombas",
    definition:
      "Valor mínimo de NPSH exigido pelo fabricante, obtido por ensaio. Se NPSHd &lt; NPSHr → cavitação.",
  },
  {
    term: "Cavitação",
    category: "Bombas",
    definition:
      "Formação e implosão de bolhas de vapor no interior da bomba quando a pressão local cai abaixo de \\(p_{vap}\\). Causa vibração, ruído, erosão e queda de desempenho.",
  },
  {
    term: "<em>Head</em> da bomba (H)",
    category: "Bombas",
    definition:
      "Energia por peso unitário de fluido fornecida pela bomba (m). Obtida pela equação de Bernoulli estendida: \\[H = \\dfrac{P_2 - P_1}{\\rho g} + (z_2 - z_1) + \\dfrac{V_2^2 - V_1^2}{2g} + h_f\\].",
  },
  {
    term: "Perda de carga singular",
    category: "Bombas",
    definition:
      "Perda localizada em acessórios: \\[h_s = K \\cdot \\frac{V^2}{2g}\\] \\(K\\) é o coeficiente de perda da conexão.",
  },
  {
    term: "Pressão de vapor (p_vap)",
    category: "Bombas",
    definition:
      "Pressão na qual o líquido entra em ebulição à temperatura de operação. Quanto maior \\(p_{vap}\\), menor a margem de NPSHd disponível. Obtida pela equação de Antoine ou por biblioteca termodinâmica (CoolProp).",
  },
  {
    term: "Potência hidráulica",
    category: "Bombas",
    definition:
      "Potência útil fornecida ao fluido: \\[P = \\frac{\\rho\\,g\\,Q\\,H}{\\eta}\\] \\(\\eta\\) é a eficiência total (produto das eficiências hidráulica, volumétrica e mecânica).",
  },
  {
    term: "CSTR",
    category: "Reatores",
    definition:
      "<em>Continuous Stirred-Tank Reactor</em>. Mistura perfeita → composição uniforme = saída. Equação de projeto: \\[V = \\frac{F_{A0}\\,X}{-r_A}\\] A taxa \\(r_A\\) é avaliada nas condições de saída.",
  },
  {
    term: "PFR",
    category: "Reatores",
    definition:
      "<em>Plug Flow Reactor</em>. Escoamento pistonado → concentrações variam ao longo do comprimento; sem mistura axial. Equação de projeto: \\[V = F_{A0}\\int_0^X \\frac{dX}{-r_A}\\] Cada elemento de fluido comporta-se como um reator batelada em movimento.",
  },
  {
    term: "Conversão (X)",
    category: "Reatores",
    definition:
      "Fração do reagente limitante consumida: \\[X = \\frac{F_{A0} - F_A}{F_{A0}}\\] Valor entre 0 e 1.",
  },
  {
    term: "Constante de velocidade (k)",
    category: "Reatores",
    definition:
      "Parâmetro cinético com dependência de temperatura via Arrhenius: \\[k = A\\,e^{-E_a/(RT)}\\] \\(A\\) = fator pré-exponencial; \\(E_a\\) = energia de ativação (J/mol). Unidade depende da ordem global da reação.",
  },
  {
    term: "Gráfico de Arrhenius",
    category: "Reatores",
    definition:
      "Representação de \\(\\ln k\\) ou \\(k\\) em função de \\(1/T\\). Em escala semilog, a reta permite estimar a energia de ativação e o fator pré-exponencial.",
  },
  {
    term: "Diagrama de Levenspiel",
    category: "Reatores",
    definition:
      "Gráfico de \\(1/(-r_A)\\) versus conversão \\(X\\). A área sob a curva corresponde ao volume do reator e conecta cinética com dimensionamento.",
  },
  {
    term: "Lei de velocidade de potência",
    category: "Reatores",
    definition:
      "\\[-r_A = k \\cdot C_A^\\alpha \\cdot C_B^\\beta \\cdots\\] A ordem global é \\(\\alpha + \\beta + \\cdots\\). Válida para reações elementares ou com mecanismo definido.",
  },
  {
    term: "Reagente limitante",
    category: "Reatores",
    definition:
      "Componente que se esgota primeiro; determina a conversão máxima. Identificado pelo menor valor de \\(F_{i0}/|n_i|\\) entre os reagentes.",
  },
  {
    term: "Tempo de residência (τ)",
    category: "Reatores",
    definition:
      "Tempo médio que o fluido permanece no reator: \\[\\tau = \\frac{V}{Q_T}\\] Para CSTR isotérmico relaciona-se com a equação de projeto: \\[\\tau = \\frac{C_{A0}\\,X}{-r_A}\\].",
  },
  {
    term: "Equação de Arrhenius",
    category: "Reatores",
    definition:
      "Dependência de \\(k\\) com a temperatura: \\[k = A\\,e^{-E_a/(RT)}\\] \\(R\\) = 8,314 J/(mol·K). Linearizável como \\(\\ln k = \\ln A - E_a/RT\\).",
  },
  {
    term: "Coef. de expansão volumétrico (ε)",
    category: "Reatores",
    definition:
      "Variação fracionária do volume para conversão completa do reagente limitante em fase gasosa: \\[\\varepsilon = y_{A0}\\,\\frac{\\sum n_P - \\sum n_R}{|n_A|}\\] \\(\\varepsilon = 0\\) para líquidos ou reações sem variação de mols gasosos.",
  },
  {
    term: "Fator de diluição (ψ)",
    category: "Reatores",
    definition:
      "Corrige a vazão volumétrica em reações gasosas com variação de mols, pressão e temperatura: \\[\\psi = (1 + \\varepsilon\\,X)\\,\\frac{P}{P_0}\\,\\frac{T_0}{T}\\] Usado para calcular concentrações de saída a partir de \\(X\\).",
  },
  {
    term: "Método de Brent",
    category: "Reatores",
    definition:
      "Algoritmo numérico para encontrar raízes de funções escalares em um intervalo \\([a, b]\\) onde \\(f(a) \\cdot f(b) < 0\\). Combina bissecção (garante convergência), secante e interpolação quadrática inversa (aceleração). Usado no CSTR e PFR quando o volume \\(V\\) ou o tempo de residência \\(\\tau\\) são dados e a conversão \\(X\\) é a incógnita - a equação de design é implícita em \\(X\\).",
  },
  {
    term: "CoolProp",
    category: "Componentes",
    definition:
      "Biblioteca termodinâmica open-source com equações de estado de alta precisão para ~120 fluidos puros e misturas.",
  },
  {
    term: "Temperatura crítica (T_c)",
    category: "Componentes",
    definition:
      "Temperatura acima da qual a distinção entre fase líquida e vapor deixa de existir. Acima de \\(T_c\\) o fluido é supercrítico.",
  },
  {
    term: "Pressão crítica (P_c)",
    category: "Componentes",
    definition:
      "Pressão correspondente ao ponto crítico. Junto com \\(T_c\\) define o estado termodinâmico crítico.",
  },
  {
    term: "Viscosidade dinâmica (μ)",
    category: "Componentes",
    definition:
      "Medida da resistência do fluido ao cisalhamento (Pa·s ou cP). Varia fortemente com a temperatura.",
  },
  {
    term: "Viscosidade cinemática (ν)",
    category: "Componentes",
    definition:
      "\\(\\nu = \\mu/\\rho\\) (m²/s ou cSt). Relevante para cálculo de Reynolds quando a massa específica é conhecida.",
  },
  {
    term: "Equação de Antoine",
    category: "Componentes",
    definition:
      "Correlação empírica para pressão de vapor em função da temperatura: \\[\\log_{10} P_{vap} = A - \\frac{B}{C + T}\\] A, B, C são constantes tabeladas por composto e faixa de temperatura. Fundamental para cálculo de NPSHd e flash.",
  },
  {
    term: "Equação de estado",
    category: "Componentes",
    definition:
      "Relação entre \\(P\\), \\(V\\) e \\(T\\) de um fluido. Gás ideal: \\(PV = nRT\\). Para sistemas reais, equações cúbicas (Peng-Robinson, SRK) adicionam termos de atração/repulsão molecular.",
  },
  {
    term: "Calor específico (c_p / c_v)",
    category: "Componentes",
    definition:
      "Energia necessária para elevar 1 kg de substância em 1 K. \\(c_p\\) a pressão constante (J/kg·K); \\(c_v\\) a volume constante. Para gases ideais: \\(c_p - c_v = R/M\\). Obtido via CoolProp a partir de T e P; alimenta balanços de energia e dimensionamento de trocadores.",
  },
  {
    term: "Entalpia específica (h)",
    category: "Componentes",
    definition:
      "Função de estado definida como \\(h = u + Pv\\), onde \\(u\\) é a energia interna, \\(P\\) a pressão e \\(v\\) o volume específico (m³/kg). Unidade: J/kg. Variação de entalpia \\(\\Delta h\\) é a troca de calor em processos a pressão constante. Fundamental em balanços de energia de trocadores, evaporadores e condensadores.",
  },
  {
    term: "Entropia específica (s)",
    category: "Componentes",
    definition:
      "Medida da desordem do sistema por unidade de massa (J/kg·K). Em processos reversíveis adiabáticos, \\(\\Delta s = 0\\) (isentrópico). Obtida via CoolProp; usada para análise de eficiência de compressores e turbinas.",
  },
  {
    term: "Condutividade térmica (λ)",
    category: "Componentes",
    definition:
      "Capacidade do material de conduzir calor (W/m·K). Governa a lei de Fourier: \\[\\dot{q} = -\\lambda \\nabla T\\] Varia com temperatura e fase; obtida via CoolProp. Insumo para cálculo de coeficientes de troca térmica em trocadores e isolamentos.",
  },
  {
    term: "Ponto de bolha / Ponto de orvalho",
    category: "Componentes",
    definition:
      "<strong>Ponto de bolha</strong>: temperatura (ou pressão) na qual a primeira bolha de vapor se forma ao aquecer um líquido a pressão constante. <strong>Ponto de orvalho</strong>: temperatura (ou pressão) na qual a primeira gota de líquido se condensa ao resfriar um vapor. Em misturas, bolha e orvalho diferem (envelope bifásico). Obtidos via CoolProp; relevantes para verificar fase do fluido nas condições de operação.",
  },
  {
    term: "Envelope de fase / domo de saturação",
    category: "Termodinâmica",
    definition:
      "Região bifásica delimitada pelas curvas de bolha e orvalho. O domo mostra onde líquido, vapor ou mistura coexistem e ajuda a localizar o ponto crítico.",
  },
  {
    term: "Corrente de processo",
    category: "Balanço",
    definition: "Fluxo de material entre unidades. direction = 1 → entrada; direction = −1 → saída.",
  },
  {
    term: "Fração molar / mássica",
    category: "Balanço",
    definition:
      "Composição normalizada da corrente: soma das frações = 1,0. Molar quando vazão é em mol/tempo; mássica quando em massa/tempo.",
  },
  {
    term: "Reciclo (<em>split</em>)",
    category: "Balanço",
    definition:
      "Retorno de parte da corrente de saída para a entrada. \\(F_R = f \\cdot F_P\\); aumenta a conversão global mas exige mais energia de bombeamento.",
  },
  {
    term: "Purga",
    category: "Balanço",
    definition:
      "Remoção de fração do reciclo para evitar acúmulo de inertes ou subprodutos: \\(F_G = (1 - f) \\cdot F_P\\).",
  },
  {
    term: "Coeficiente estequiométrico",
    category: "Balanço",
    definition:
      "Indica proporção de consumo/produção na reação. Negativo para reagentes; positivo para produtos. Escala relativa.",
  },
  {
    term: "Estado estacionário",
    category: "Balanço",
    definition:
      "Condição em que não há acúmulo de massa no sistema (acúmulo = 0): \\[\\sum \\dot{m}_{entrada} = \\sum \\dot{m}_{saida}\\] Com reação, inclui termos de geração/consumo estequiométricos por componente.",
  },
  {
    term: "Vazão molar (F_i)",
    category: "Balanço",
    definition:
      "Quantidade molar de componente \\(i\\) por unidade de tempo: \\(F_i = C_i \\cdot Q_i\\) (mol/s). \\(F_{A0}\\) é a vazão molar do reagente limitante na entrada do reator.",
  },
  {
    term: "Curva de pressão de vapor",
    category: "Termodinâmica",
    definition:
      "Relação entre a temperatura e a pressão de saturação de um fluido. Em escala semilog, evidencia a tendência exponencial prevista pela relação de Clausius-Clapeyron. Base para avaliar ebulição, flash e margem de cavitação em bombas.",
  },
  {
    term: "Superfície de propriedades T-P",
    category: "Termodinâmica",
    definition:
      "Mapa bidimensional de uma propriedade termodinâmica em função de temperatura e pressão. Mostra como massa específica, entalpia, entropia ou outras propriedades variam no domínio do fluido e ajuda a identificar regiões de forte sensibilidade ou mudança de fase.",
  },
  {
    term: "Diagrama ternário",
    category: "Balanço",
    definition:
      "Representação em triângulo das frações de três componentes cuja soma é 1. Em engenharia química, ajuda a visualizar separações líquido-líquido, misturas e a composição de correntes em sistemas com três espécies dominantes.",
  },
  {
    term: "Equilíbrio binário (T-x-y / y-x)",
    category: "Termodinâmica",
    definition:
      "Curva de equilíbrio líquido-vapor para misturas binárias. Mostra a temperatura de bolha, a temperatura de orvalho e a relação entre composições líquidas e vapores em uma pressão fixa. É a base visual da destilação binária didática.",
  },
  {
    term: "McCabe-Thiele",
    category: "Termodinâmica",
    definition:
      "Método gráfico para estimar o número de estágios teóricos em uma coluna de destilação binária. Usa a curva de equilíbrio, a linha de operação, a linha q e a construção em degraus entre alimentação, destilado e fundo.",
  },
  {
    term: "Mapa de eficiência da bomba",
    category: "Bombas",
    definition:
      "Superfície/contorno que mostra a eficiência da bomba em função de vazão e altura. O ponto de melhor eficiência (BEP) costuma ficar próximo ao centro da região de maior rendimento e serve como referência de operação estável.",
  },
  {
    term: "Ponto de melhor eficiência (BEP)",
    category: "Bombas",
    definition:
      "<em>Best Efficiency Point</em>. Condição de operação em que a bomba atinge a maior eficiência hidráulica. Operar próximo ao BEP reduz vibração, recirculação interna e risco de cavitação.",
  },
  {
    term: "Curva característica da bomba",
    category: "Bombas",
    definition:
      "Relação entre altura manométrica e vazão da bomba, normalmente em forma decrescente. É a base para comparar o equipamento com a demanda do sistema.",
  },
  {
    term: "Curva da bomba e do sistema",
    category: "Bombas",
    definition:
      "Gráfico que sobrepõe a curva H×Q da bomba e a curva de perda de carga do sistema. O ponto de interseção define a vazão e a altura manométrica de operação.",
  },
  {
    term: "Margem de NPSH",
    category: "Bombas",
    definition:
      "Diferença entre NPSHd e NPSHr: \\(\\text{margem} = NPSHd - NPSHr\\). Valores positivos indicam folga contra cavitação; margens pequenas reduzem a confiabilidade.",
  },
  {
    term: "Perfil de pressão por trecho/acessório",
    category: "Bombas",
    definition:
      "Queda acumulada de pressão ao longo da tubulação, destacando cada trecho reto e cada acessório. Ajuda a localizar onde a maior perda de carga ocorre.",
  },
  {
    term: "Perfil de PFR",
    category: "Reatores",
    definition:
      "Distribuição das concentrações e da temperatura ao longo do volume do reator de fluxo pistão. Didaticamente ajuda a visualizar como o perfil muda do <em>inlet</em> ao <em>outlet</em> e por que a integração ao longo do volume é necessária.",
  },
  {
    term: "Perfil de velocidade",
    category: "Hidráulica",
    definition:
      "Distribuição da velocidade ao longo da seção transversal do duto. Em regime laminar circular é parabólico; em turbulento tende a um perfil mais achatado.",
  },
  {
    term: "Curvas compostas",
    category: "Transferência de calor",
    definition:
      "Representação agregada das curvas quente e fria de um processo, usada em análise de pinch para localizar o gargalo térmico e o menor consumo externo de utilidades.",
  },
  {
    term: "Tabela de correntes",
    category: "Balanço",
    definition:
      "Resumo estruturado das correntes de um processo com vazões, composições e direção de fluxo. Serve como base para balanços de massa e para conferência de consistência.",
  },
  {
    term: "Sankey de massa e energia",
    category: "Balanço",
    definition:
      "Diagrama em que a largura dos fluxos é proporcional à magnitude de massa ou energia transportada. Muito útil para visualizar reciclos, purgas e gargalos de utilidades.",
  },
];
