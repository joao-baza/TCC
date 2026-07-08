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
        Este gráfico mostra como a conversão global do PFR varia quando a razão de
        reciclo R muda. O eixo horizontal representa o quanto da corrente de saída volta
        ao reator e o eixo vertical mostra a conversão obtida para essa condição.
      </p>
      <MathBlock
        expression={
          "\\frac{1}{Da} = (R+1)\\ln\\left(\\frac{1-\\frac{R}{R+1}X}{1-X}\\right)"
        }
      />
      <p className="text-sm text-slate-700">
        Para interpretar, acompanhe o deslocamento da curva da esquerda para a direita:
        isso mostra o efeito de aumentar o reciclo sobre a conversão. A inclinação indica
        se a recirculação ainda traz ganho relevante ou se o sistema já entrou em uma
        faixa de retorno decrescente.
      </p>
      <p className="text-sm text-slate-700">
        A utilidade prática é comparar sensibilidade operacional. O gráfico ajuda a
        discutir se vale a pena elevar o reciclo para aumentar conversão ou se isso
        apenas amplia vazão circulante, custo de bombeamento e complexidade operacional.
      </p>
    </HowItWorks>
  );
}

export function ArrheniusHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Arrhenius">
      <p className="text-sm text-slate-700">
        O gráfico de Arrhenius relaciona a cinética com a temperatura. No eixo x aparece
        1000/T e no eixo y aparece ln(k), de modo que a dependência exponencial da
        constante de velocidade se torna aproximadamente linear.
      </p>
      <p className="text-sm text-slate-700">
        Para interpretar, observe a inclinação da reta: quanto mais inclinada, maior a
        sensibilidade de k a mudanças de temperatura e, portanto, maior o efeito da
        energia de ativação sobre a reação.
      </p>
      <p className="text-sm text-slate-700">
        A utilidade do gráfico é comparar cenários térmicos, estimar tendência de
        aceleração reacional e explicar por que pequenas mudanças de temperatura podem
        alterar fortemente a taxa de reação.
      </p>
      <TheoryRef>
        Ref.: Fogler, Elements of Chemical Reaction Engineering.
      </TheoryRef>
    </HowItWorks>
  );
}
