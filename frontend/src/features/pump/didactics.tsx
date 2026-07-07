import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function HeadlossHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Perda de Carga">
      <p>
        A perda de carga total combina o atrito ao longo da linha reta com as
        perdas localizadas em conexões, válvulas e acessórios.
      </p>
      <MathBlock expression={"h_f = f \\dfrac{L}{D} \\dfrac{V^2}{2g} + \\sum K \\dfrac{V^2}{2g}"} />
      <VariablesTable
        rows={[
          { symbol: "h_f", description: "Perda de carga total", unit: "m" },
          { symbol: "f", description: "Fator de atrito de Darcy", unit: "adimensional" },
          { symbol: "L", description: "Comprimento da linha", unit: "m" },
          { symbol: "D", description: "Diametro interno", unit: "m" },
          { symbol: "V", description: "Velocidade media", unit: "m/s" },
        ]}
      />
      <p>
        Para Hazen-Williams, o coeficiente de rugosidade resume o efeito do
        material sobre a perda de carga em linhas de agua.
      </p>
      <TheoryRef>Ref.: White, Mecanica dos Fluidos, 8a ed., McGraw-Hill, 2018.</TheoryRef>
    </HowItWorks>
  );
}

export function NpshHowItWorks() {
  return (
    <HowItWorks title="Como funciona - NPSH Disponivel">
      <p>
        O NPSH disponivel compara a energia absoluta na sucao com a pressao de
        vapor do fluido para verificar a margem contra cavitacao.
      </p>
      <MathBlock expression={"NPSH_d = \\dfrac{P_m + P_{atm} - P_v}{\\rho g} + z - h_f - \\dfrac{V^2}{2g}"} />
      <VariablesTable
        rows={[
          { symbol: "NPSH_d", description: "NPSH disponivel", unit: "m" },
          { symbol: "P_m", description: "Pressao manometrica", unit: "kgf/cm²" },
          { symbol: "P_{atm}", description: "Pressao atmosferica", unit: "kgf/cm²" },
          { symbol: "P_v", description: "Pressao de vapor", unit: "kgf/cm²" },
          { symbol: "h_f", description: "Perdas na succao", unit: "m" },
        ]}
      />
      <p>
        Uma margem positiva entre NPSHd e NPSHr reduz o risco de formacao de
        bolhas e erosao no rotor.
      </p>
      <TheoryRef>Ref.: Karassik et al., Pump Handbook, 4a ed., McGraw-Hill.</TheoryRef>
    </HowItWorks>
  );
}

export function HeadHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Altura Manometrica">
      <p>
        A altura manometrica expressa a energia especifica que a bomba precisa
        adicionar ao fluido para vencer diferenca de pressao, cota, velocidade e
        perdas.
      </p>
      <MathBlock expression={"H = \\dfrac{P_2 - P_1}{\\rho g} + (z_2 - z_1) + \\dfrac{V_2^2 - V_1^2}{2g} + h_f"} />
      <VariablesTable
        rows={[
          { symbol: "H", description: "Altura manometrica requerida", unit: "m" },
          { symbol: "\\Delta P/(\\rho g)", description: "Parcela de pressao", unit: "m" },
          { symbol: "\\Delta z", description: "Parcela de elevacao", unit: "m" },
          { symbol: "\\Delta V^2/(2g)", description: "Parcela cinetica", unit: "m" },
          { symbol: "h_f", description: "Perda de carga total", unit: "m" },
        ]}
      />
      <TheoryRef>Ref.: Fox, McDonald e Pritchard, Introducao a Mecanica dos Fluidos.</TheoryRef>
    </HowItWorks>
  );
}
