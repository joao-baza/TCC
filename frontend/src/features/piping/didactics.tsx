import { HowItWorks } from "@/components/how-it-works";

export function PipingCompositionsHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Materiais da tubulação">
      <p>
        O material representa a composição construtiva ou a condição interna da tubulação consultada.
        Ele resume características que o catálogo usa para descrever o comportamento
        hidráulico da tubulação.
      </p>
      <p>
        <strong>O que interfere:</strong> a rugosidade do material, o estado da superfície
        e o coeficiente de atrito influenciam diretamente a perda de carga e a leitura dos
        demais cálculos que dependem dessa seleção.
      </p>
      <p>
        <strong>Importância:</strong> escolher o material correto evita resultados
        incoerentes e garante que o dimensionamento seja compatível com o fluido, a
        operação e a condição real da tubulação.
      </p>
    </HowItWorks>
  );
}

export function PipingSchedulesHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Schedules e Diâmetros">
      <p>
        O schedule define a espessura da parede da tubulação e, junto com o diâmetro nominal,
        determina o espaço real disponível para escoamento.
      </p>
      <p>
        <strong>O que interfere:</strong> a espessura da parede altera o diâmetro interno,
        a área de passagem, a velocidade do fluido, a perda de carga e a resistência
        mecânica da tubulação.
      </p>
      <p>
        <strong>Importância:</strong> essa escolha conecta o cálculo hidráulico à peça
        comercial que realmente será usada no projeto, evitando sobrecarga, subdimensionamento
        e incompatibilidades de catálogo.
      </p>
    </HowItWorks>
  );
}

export function PipingConnectionsHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Conexões">
      <p>
        Conexões são os acessórios que mudam direção, fazem derivações, unem trechos ou
        adaptam a tubulação às condições de montagem.
      </p>
      <p>
        <strong>O que interfere:</strong> cada conexão cria perdas localizadas e pode mudar o
        caminho do escoamento, influenciando a carga disponível, a vazão e o desempenho dos
        equipamentos conectados.
      </p>
      <p>
        <strong>Importância:</strong> elas representam os pontos onde o sistema ganha
        flexibilidade de montagem, mas também onde a análise hidráulica precisa ser mais
        cuidadosa para manter o projeto confiável.
      </p>
    </HowItWorks>
  );
}
