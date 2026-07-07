import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function ReynoldsHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Número de Reynolds">
      <p>
        O número de Reynolds compara os efeitos de <strong>inércia</strong> com os efeitos{" "}
        <strong>viscosos</strong> no escoamento interno.
      </p>
      <MathBlock expression={"Re = \\dfrac{\\rho v D}{\\mu} = \\dfrac{vD}{\\nu}"} />
      <VariablesTable
        rows={[
          { symbol: "Re", description: "Número de Reynolds", unit: "adimensional" },
          { symbol: "\\rho", description: "Densidade do fluido", unit: "kg/m³" },
          { symbol: "v", description: "Velocidade média", unit: "m/s" },
          { symbol: "D", description: "Diâmetro característico", unit: "m" },
          { symbol: "\\mu", description: "Viscosidade dinâmica", unit: "Pa.s" },
          { symbol: "\\nu", description: "Viscosidade cinemática", unit: "m²/s" },
        ]}
      />
      <p>
        Em tubos, valores menores que <strong>2300</strong> indicam regime laminar; entre{" "}
        <strong>2300</strong> e <strong>3999</strong>, a faixa é de transição; a partir de{" "}
        <strong>4000</strong>, o escoamento tende a ser turbulento.
      </p>
      <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8a ed., McGraw-Hill, 2018.</TheoryRef>
    </HowItWorks>
  );
}

export function FrictionFactorHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Fator de Atrito">
      <p>
        O fator de atrito de Darcy quantifica a resistência ao escoamento ao longo de uma
        linha pressurizada e entra diretamente na equação de Darcy-Weisbach.
      </p>
      <MathBlock expression={"h_f = f\\,\\dfrac{L}{D}\\,\\dfrac{V^2}{2g}"} />
      <p>
        Para regime laminar, o fator é obtido analiticamente por{" "}
        <strong>f = 64 / Re</strong>. Em regime turbulento, o cálculo depende da rugosidade
        relativa e do número de Reynolds, com correlações implícitas ou aproximadas como a
        equação de Colebrook-White, Haaland e Swamee-Jain.
      </p>
      <MathBlock
        expression={
          "\\dfrac{1}{\\sqrt{f}} = -2 \\log_{10}\\left(\\dfrac{\\varepsilon}{3.7D} + \\dfrac{2.51}{Re\\sqrt{f}}\\right)"
        }
      />
      <VariablesTable
        rows={[
          { symbol: "f", description: "Fator de atrito de Darcy", unit: "adimensional" },
          { symbol: "h_f", description: "Perda de carga distribuída", unit: "m" },
          { symbol: "L", description: "Comprimento da tubulação", unit: "m" },
          { symbol: "D", description: "Diâmetro interno", unit: "m" },
          { symbol: "V", description: "Velocidade média", unit: "m/s" },
          { symbol: "\\varepsilon", description: "Rugosidade absoluta", unit: "m" },
          { symbol: "Re", description: "Número de Reynolds", unit: "adimensional" },
        ]}
      />
      <p>
        <strong>O que interfere:</strong> Reynolds, rugosidade do material, diâmetro interno,
        comprimento do trecho e método de correlação adotado.
      </p>
      <p>
        <strong>Importância:</strong> o valor de <em>f</em> governa a perda de carga
        distribuída, influencia a seleção da bomba e orienta a comparação entre materiais e
        condições operacionais.
      </p>
      <TheoryRef>
        Ref.: White, Mecânica dos Fluidos, 8a ed., McGraw-Hill, 2018; Colebrook e White,
        1937; Swamee e Jain, 1976.
      </TheoryRef>
    </HowItWorks>
  );
}

export function HydraulicDiameterHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Diâmetro Hidráulico">
      <p>
        O diâmetro hidráulico é uma dimensão equivalente usada para representar seções não
        circulares em correlações desenvolvidas para tubos.
      </p>
      <MathBlock expression={"D_h = \\dfrac{4A}{P_{molhado}}"} />
      <VariablesTable
        rows={[
          { symbol: "D_h", description: "Diâmetro hidráulico", unit: "m" },
          { symbol: "A", description: "Área de escoamento", unit: "m²" },
          { symbol: "P_{molhado}", description: "Perímetro molhado", unit: "m" },
        ]}
      />
      <p>
        Esse valor é usado para substituir o diâmetro real nas expressões de Reynolds, fator
        de atrito e perda de carga quando a seção transversal não é circular.
      </p>
      <p>
        <strong>O que interfere:</strong> a geometria da seção, a área disponível ao fluxo e o
        perímetro em contato com o fluido.
      </p>
      <p>
        <strong>Importância:</strong> ele permite aplicar métodos consagrados de escoamento
        interno em dutos retangulares, anulares e outras geometrias de engenharia.
      </p>
      <TheoryRef>Ref.: Munson, Young e Okiishi, Fundamentos de Mecânica dos Fluidos.</TheoryRef>
    </HowItWorks>
  );
}
