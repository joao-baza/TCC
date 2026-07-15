import { HowItWorks, TheoryRef } from "@/components/how-it-works";
import { MathBlock } from "@/components/math-block";
import { VariablesTable } from "@/components/variables-table";

export function BalanceHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Balanço de Massa">
      <p>
        Em regime estacionário, a conservação de massa impõe que o total que entra no
        sistema seja igual ao total que sai, descontando geração e consumo por reação.
      </p>
      <MathBlock expression={"\\sum \\dot m_{entrada} + \\dot m_{gerado} = \\sum \\dot m_{saida} + \\dot m_{consumido}"} />
      <VariablesTable
        headers={["Conceito", "Descricao", "Unidade"]}
        rows={[
          { symbol: "\\dot m", description: "Vazao de massa ou molar da corrente", unit: "u. cons./tempo" },
          { symbol: "direction = 1", description: "Corrente entrando no sistema", unit: "-" },
          { symbol: "direction = -1", description: "Corrente saindo do sistema", unit: "-" },
          { symbol: "X", description: "Conversao do componente-chave", unit: "0-1" },
        ]}
      />
      <p>
        Em sistemas com reciclo e purga, o split distribui a corrente principal entre a
        fração que retorna ao processo e a fração removida para evitar acúmulo.
      </p>
      <MathBlock expression={"F_R = f\\,F_P \\qquad F_G = (1-f)\\,F_P"} />
      <TheoryRef>
        Ref.: Felder e Rousseau, Elementary Principles of Chemical Processes, 4a ed.;
        Reklaitis et al., Introduction to Material and Energy Balances.
      </TheoryRef>
    </HowItWorks>
  );
}
