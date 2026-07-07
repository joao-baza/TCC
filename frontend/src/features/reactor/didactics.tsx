import { MathBlock } from "@/components/math-block";
import { HowItWorks, TheoryRef } from "@/components/how-it-works";

export function CstrHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Reator CSTR">
      <p className="text-sm text-slate-700">
        No CSTR, assume-se mistura perfeita. A composição de saída é igual à composição
        em todo o volume do tanque, então a taxa de reação é avaliada nas condições de
        saída.
      </p>
      <MathBlock expression={"V = \\frac{F_{A0} X}{-r_{A,saida}}"} />
      <p className="text-sm text-slate-700">
        Para reações irreversíveis, o aumento de conversão eleva o volume requerido mais
        rapidamente porque o termo de taxa diminui à medida que o reagente A é consumido.
      </p>
      <TheoryRef>
        Use este modelo para discutir custo volumétrico, back-mixing e sensibilidade da
        conversão à cinética na saída.
      </TheoryRef>
    </HowItWorks>
  );
}

export function PfrHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Reator PFR">
      <p className="text-sm text-slate-700">
        No PFR, o fluido evolui ao longo do comprimento do reator. Cada posição trabalha
        com uma composição diferente, então os perfis de concentração e temperatura mudam
        de forma contínua enquanto o material avança pelo tubo.
      </p>
      <MathBlock expression={"V = F_{A0}\\int_0^X \\frac{dX}{-r_A}"} />
      <p className="text-sm text-slate-700">
        Em cinéticas positivas, o PFR tende a exigir menos volume do que o CSTR para a
        mesma conversão porque aproveita melhor as concentrações altas na entrada e
        só depois integra o efeito reacional ao longo do comprimento.
      </p>
      <TheoryRef>
        O diagrama de Levenspiel mostra a área acumulada do PFR, enquanto o perfil do
        próprio reator deixa explícito onde cada ponto calculado foi obtido.
      </TheoryRef>
    </HowItWorks>
  );
}

export function PfrRecycleDaHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Conversão x reciclo">
      <p className="text-sm text-slate-700">
        Este gráfico resume, de forma didática, como a conversão global do PFR com
        reciclo varia quando a razão de reciclo R muda. Cada curva fixa um valor de
        Damköhler e permite comparar a sensibilidade da conversão à recirculação.
      </p>
      <MathBlock
        expression={
          "\\frac{1}{Da} = (R+1)\\ln\\left(\\frac{1-\\frac{R}{R+1}X}{1-X}\\right)"
        }
      />
      <p className="text-sm text-slate-700">
        Leia o eixo horizontal como a razão de reciclo e o eixo vertical como a
        conversão. Em cada curva, deslocar-se para a direita mostra o efeito de aumentar
        o reciclo; curvas com menor Da ficam mais altas porque a reação avança mais para
        a mesma condição operacional.
      </p>
      <TheoryRef>
        Use este mapa para comparar desempenho sem perder de vista a cinética de
        entrada. Ele serve como apoio visual, não como substituto do cálculo completo.
      </TheoryRef>
    </HowItWorks>
  );
}
