# 🌐 Simulador Didático de Operações Unitárias

Projeto de TCC em Engenharia Química da UFMS, desenvolvido por **João Pedro Baza Garcia Rodrigues** [[LinkedIn]](https://www.linkedin.com/in/joao-baza/) sob orientação do **Prof. Celso Murilo dos Santos** [[LinkedIn]](https://www.linkedin.com/in/celso-murilo-dos-santos/). O código pode ser testado online [aqui](https://tcc.homelab.sistemasj.com.br) - (última atualização do link: 15/11/2025)

## Contexto Acadêmico
- Trabalho de Conclusão de Curso que propõe um software web gratuito para simulação e dimensionamento de operações unitárias.
- Motivação: democratizar ferramentas de cálculo usadas em projetos químicos, reduzindo dependência de softwares caros como Aspen Plus®, HYSYS® ou ChemCAD®.

## Introdução, Justificativa e Objetivos
- **Introdução**: dimensionar equipamentos de processos químicos exige domínio de balanços de massa/energia, termodinâmica, transferência de calor/massa e cinética química. O sistema integra esses conceitos em uma aplicação acessível.
- **Justificativa**: instituições sem licenças comerciais carecem de plataformas didáticas. A solução aberta permite aprendizado ativo, visualização de resultados em tempo real e colaboração interdisciplinar.
- **Objetivo Geral**: oferecer um software web modular para cálculo e dimensionamento de operações unitárias, usando arquitetura cliente-servidor e API aberta.
- **Objetivos Específicos**:
  1. Implementar rotinas clássicas de dimensionamento (trocadores, colunas, absorção, evaporação, reatores, tubulações).
  2. Desenvolver interface web responsiva e amigável.
  3. Integrar banco local de propriedades físico-químicas (hardcoded inicialmente) e bibliotecas científicas.
  4. Validar resultados com literatura e ferramentas comerciais para garantir confiabilidade.

## Finalidade Didática
- Suporta estudos de caso que conectam teoria (balanços, cinética, escoamento) com implementação computacional moderna.
- Incentiva contribuições abertas para expandir catálogos de propriedades, novos módulos de processos e estudos comparativos com softwares proprietários a partir de estudioso tanto da engenharia química quanto de software.

## TODO:
- CAPE-OPEN
- Retirada de valores hardcoded
	1. Valor máximo da conversão por método de Brent
	2. Características, propriedades e schedules de tubulações

---
Contribuições e feedbacks são bem-vindos!