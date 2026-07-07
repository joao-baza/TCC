import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function ReynoldsHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Número de Reynolds">
      <p>
        O número de Reynolds compara os efeitos de <strong>inércia</strong> com os
        efeitos <strong>viscosos</strong> no escoamento interno.
      </p>
      <MathBlock expression={"Re = \\dfrac{\\rho v D}{\\mu} = \\dfrac{vD}{\\nu}"} />
      <VariablesTable
        rows={[
          { symbol: "Re", description: "Número de Reynolds", unit: "adimensional" },
          { symbol: "\\rho", description: "Densidade do fluido", unit: "kg/m³" },
          { symbol: "v", description: "Velocidade média", unit: "m/s" },
          { symbol: "D", description: "Diâmetro característico", unit: "m ou mm" },
          { symbol: "\\mu", description: "Viscosidade dinâmica", unit: "Pa.s" },
          { symbol: "\\nu", description: "Viscosidade cinemática", unit: "m²/s" },
        ]}
      />
      <p>
        Em tubos, valores menores que <strong>2300</strong> indicam regime laminar;
        entre <strong>2300</strong> e <strong>3999</strong>, a faixa é de transição;
        a partir de <strong>4000</strong>, o escoamento tende a ser turbulento.
      </p>
      <TheoryRef>Ref.: White, Mecânica dos Fluidos, 8a ed., McGraw-Hill, 2018.</TheoryRef>
    </HowItWorks>
  );
}
