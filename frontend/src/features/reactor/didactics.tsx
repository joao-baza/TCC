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
        com uma composição diferente, então o volume total resulta da soma incremental do
        esforço reacional ao longo da conversão.
      </p>
      <MathBlock expression={"V = F_{A0}\\int_0^X \\frac{dX}{-r_A}"} />
      <p className="text-sm text-slate-700">
        Em cinéticas positivas, o PFR tende a exigir menos volume do que o CSTR para a
        mesma conversão porque aproveita melhor as concentrações altas na entrada.
      </p>
      <TheoryRef>
        O diagrama de Levenspiel ajuda a visualizar essa diferença comparando a área
        acumulada do PFR com o retângulo operacional do CSTR.
      </TheoryRef>
    </HowItWorks>
  );
}
