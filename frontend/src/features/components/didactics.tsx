import { HowItWorks, TheoryRef } from "@/components/how-it-works";

export function CriticalPropertiesHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Propriedades Críticas">
      <p>
        Propriedades críticas descrevem o ponto acima do qual a distinção entre fase
        líquida e vapor desaparece.
      </p>
      <p>
        Nesta consulta, o sistema obtém temperatura crítica, pressão crítica,
        densidade crítica e propriedades de ponto triplo usando o backend termodinâmico.
      </p>
      <TheoryRef>
        Ref.: Bell et al., CoolProp - An Open-Source Thermodynamics Library, 2014.
      </TheoryRef>
    </HowItWorks>
  );
}

export function PurePropertiesHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Fluido Puro">
      <p>
        Calcula propriedades termodinâmicas e de transporte de fluidos puros nas
        condições de temperatura e pressão informadas.
      </p>
      <p>
        O módulo permite consultar múltiplas propriedades em sequência, como densidade,
        viscosidade, entalpia, entropia e condutividade térmica.
      </p>
      <p>
        Esses resultados alimentam diretamente outros módulos do projeto, como Reynolds,
        NPSH e exercícios integrados.
      </p>
      <TheoryRef>
        Ref.: Smith, Van Ness & Abbott, Introduction to Chemical Engineering Thermodynamics.
      </TheoryRef>
    </HowItWorks>
  );
}

export function MixturePropertiesHowItWorks() {
  return (
    <HowItWorks title="Como funciona - Misturas">
      <p>
        Calcula propriedades termodinâmicas de misturas a partir das frações molares de
        cada componente.
      </p>
      <p>
        As frações molares devem somar exatamente 1,0 para representar corretamente a
        composição enviada ao backend.
      </p>
      <p>
        A interface permite montar misturas com múltiplos fluidos e solicitar várias
        propriedades da mistura no mesmo cálculo.
      </p>
      <TheoryRef>
        Ref.: Bell et al., CoolProp - An Open-Source Thermodynamics Library, 2014.
      </TheoryRef>
    </HowItWorks>
  );
}
