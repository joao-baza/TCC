export type GlossaryTerm = {
  term: string;
  cat: string;
  def: string;
};

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Número de Reynolds (Re)",
    cat: "Hidráulica",
    def: "Adimensional que relaciona forças inerciais e viscosas. Re < 2300 indica regime laminar; acima de 4000, turbulento."
  },
  {
    term: "Fator de atrito de Darcy (f)",
    cat: "Hidráulica",
    def: "Coeficiente adimensional usado em Darcy-Weisbach para perda de carga distribuída."
  },
  {
    term: "Equação da continuidade",
    cat: "Dimensionamento",
    def: "Para escoamento incompressível em seção circular: Q = V · πD²/4."
  },
  {
    term: "Schedule (ASME)",
    cat: "Dimensionamento",
    def: "Padrão comercial de espessura de parede do tubo, como SCH10, SCH40 e SCH80."
  },
  {
    term: "NPSH Disponível (NPSHd)",
    cat: "Bombas",
    def: "Altura de pressão de sucção disponível para a bomba. Deve superar o NPSHr para evitar cavitação."
  },
  {
    term: "CSTR",
    cat: "Reatores",
    def: "Continuous Stirred-Tank Reactor. Reator de mistura perfeita com composição uniforme igual à de saída."
  },
  {
    term: "CoolProp",
    cat: "Componentes",
    def: "Biblioteca termodinâmica open-source para propriedades de fluidos puros e misturas."
  },
  {
    term: "Corrente de processo",
    cat: "Balanço",
    def: "Fluxo de material entre unidades de processo, tratado como entrada ou saída do sistema."
  }
];
