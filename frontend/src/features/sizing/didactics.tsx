import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function DiameterHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Calculo de Diametro">
      <p>
        Para escoamento em secao circular, a equacao da continuidade relaciona a{" "}
        <strong>vazao volumetrica</strong>, a <strong>velocidade media</strong> e a{" "}
        <strong>area transversal</strong> do tubo:
      </p>
      <MathBlock expression={"D = \\sqrt{\\dfrac{4Q}{\\pi V}}"} />
      <VariablesTable
        rows={[
          { symbol: "D", description: "Diametro calculado", unit: "m" },
          { symbol: "Q", description: "Vazao volumetrica", unit: "m³/s" },
          { symbol: "V", description: "Velocidade media do fluido", unit: "m/s" },
        ]}
      />
      <p>
        <strong>Diametro comercial:</strong> o valor calculado e um minimo teorico. Na
        pratica, seleciona-se o <em>diametro nominal imediatamente superior</em> disponivel
        no catalogo para o schedule desejado.
      </p>
      <p>
        <strong>Dica:</strong> velocidades muito altas causam erosão e ruído; muito baixas
        favorecem deposição de sólidos.
      </p>
      <TheoryRef>Ref.: White, Mecanica dos Fluidos, 8a ed., McGraw-Hill, 2018.</TheoryRef>
    </HowItWorks>
  );
}

export function RealDiameterHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Diametro Nominal Comercial">
      <p>
        O diâmetro calculado é um valor contínuo. Na prática, tubos são fabricados em{" "}
        <strong>diâmetros nominais padronizados</strong> por <em>schedule</em>.
      </p>
      <p>
        A lógica de seleção é encontrar o <em>diâmetro interno real</em> imediatamente
        superior ao diâmetro calculado no catálogo do schedule escolhido.
      </p>
      <VariablesTable
        headers={["Conceito", "Descricao"]}
        rows={[
          {
            symbol: "DN (Diametro Nominal)",
            description: "Designador comercial em mm - não é o diâmetro interno real",
          },
          {
            symbol: "Schedule (SCH)",
            description: "Indica a espessura da parede; quanto maior o número, menor o diâmetro interno",
          },
          {
            symbol: "Diâmetro interno real",
            description: "Diâmetro externo - 2 x espessura de parede",
          },
        ]}
      />
      <p>
        <strong>Fluxo de uso:</strong> calcule D, selecione o schedule e o sistema retorna o
        menor DN comercial cujo diâmetro interno é maior ou igual ao calculado.
      </p>
      <TheoryRef>Ref.: ASME B36.10M e White, Mecanica dos Fluidos, 8a ed.</TheoryRef>
    </HowItWorks>
  );
}
