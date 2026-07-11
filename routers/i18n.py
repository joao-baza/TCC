from __future__ import annotations

from collections.abc import Iterable
from typing import Any

ERROR_TRANSLATIONS = {
    "Either dynamic viscosity or kinematic viscosity must be provided": "Informe a viscosidade dinâmica ou a viscosidade cinemática.",
    "Shape must be 'circular', 'rectangular', 'annular', 'triangular', or 'circularCap'": "A forma deve ser 'circular', 'retangular', 'anelar', 'triangular' ou 'canal circular'.",
    "Diameter is required for circular shape": "Informe o diâmetro para a forma circular.",
    "Width is required for rectangular shape": "Informe a largura para a forma retangular.",
    "Height is required for rectangular shape": "Informe a altura para a forma retangular.",
    "Outer diameter is required for annular shape": "Informe o diâmetro externo para a forma anelar.",
    "Inner diameter is required for annular shape": "Informe o diâmetro interno para a forma anelar.",
    "Side A is required for triangular shape": "Informe o lado A para a forma triangular.",
    "Side B is required for triangular shape": "Informe o lado B para a forma triangular.",
    "Side C is required for triangular shape": "Informe o lado C para a forma triangular.",
    "Diameter is required for circular cap": "Informe o diâmetro para o canal circular.",
    "Height is required for circular cap": "Informe a altura para o canal circular.",
    "Input type must be 'conversion_and_kinetics', 'volume_and_kinetics', or 'residence_time_and_kinetics'": "O tipo de cálculo deve ser 'conversion_and_kinetics', 'volume_and_kinetics' ou 'residence_time_and_kinetics'.",
    "Reaction rate parameters must include 'k'": "Os parâmetros da taxa de reação devem incluir 'k'.",
    "Reaction rate parameters must include 'reaction_orders'": "Os parâmetros da taxa de reação devem incluir 'reaction_orders'.",
    "Operation conditions must include 'initial_temperature'": "As condições de operação devem incluir 'initial_temperature'.",
    "Operation conditions must include 'initial_pressure'": "As condições de operação devem incluir 'initial_pressure'.",
    "Operation conditions must include 'final_temperature'": "As condições de operação devem incluir 'final_temperature'.",
    "Operation conditions must include 'final_pressure'": "As condições de operação devem incluir 'final_pressure'.",
    "Conversion is required for conversion_and_kinetics input type": "A conversão é obrigatória para o tipo de cálculo conversion_and_kinetics.",
    "Volume is required for volume_and_kinetics input type": "O volume é obrigatório para o tipo de cálculo volume_and_kinetics.",
    "Residence time is required for residence_time_and_kinetics input type": "O tempo de residência é obrigatório para o tipo de cálculo residence_time_and_kinetics.",
    "Method for calculating friction factor": "Método para calcular o fator de atrito",
    "Invalid method. Use \"Darcy-Weisbach\" or \"Hazen-Williams\".": "Método inválido. Use \"Darcy-Weisbach\" ou \"Hazen-Williams\".",
    "Invalid friction factor method.": "Método de fator de atrito inválido.",
    "Invalid shape. Use 'circular', 'rectangular', 'annular', 'triangular', or 'circularCap'.": "Forma inválida. Use 'circular', 'retangular', 'anelar', 'triangular' ou 'canal circular'.",
    "Colebrook equation solver failed to converge.": "O solucionador da equação de Colebrook não convergiu.",
    "Use only liquid or only gaseous components": "Use apenas componentes líquidos ou apenas gasosos.",
    "Components and stoichiometric coefficients must have the same length.": "Os componentes e os coeficientes estequiométricos devem ter o mesmo comprimento.",
    "No limiting reagent found. Check stoichiometric coefficients and components.": "Nenhum reagente limitante foi encontrado. Verifique os coeficientes estequiométricos e os componentes.",
    "The reaction rate cannot be zero.": "A taxa de reação não pode ser zero.",
    "Failed to converge to a valid conversion value.": "Não foi possível convergir para um valor válido de conversão.",
    "Either 'conversion' or 'X' must be provided.": "Informe 'conversion' ou 'X'.",
    "Negative flow rate detected in stream": "Vazão negativa detectada na corrente",
    "Negative composition detected for component": "Composição negativa detectada para o componente",
    "The component fractions in stream": "As frações dos componentes na corrente",
    "do not sum to approximately 1": "não somam aproximadamente 1",
    "Missing flow rate for stream": "Vazão ausente na corrente",
    "Missing compositions for stream": "Composições ausentes na corrente",
    "The system is underdetermined": "O sistema está subdeterminado",
    "The system is underdetermined or has no solution.": "O sistema está subdeterminado ou não possui solução.",
    "The system is underdetermined (infinite solutions or symbolic result). Check the degrees of freedom.": "O sistema está subdeterminado (soluções infinitas ou resultado simbólico). Verifique os graus de liberdade.",
    "Check the degrees of freedom.": "Verifique os graus de liberdade.",
    "Temperature max must be greater than temperature min.": "A temperatura máxima deve ser maior que a temperatura mínima.",
    "Pressure max must be greater than pressure min.": "A pressão máxima deve ser maior que a pressão mínima.",
    "Unsupported property for the surface map.": "Propriedade não suportada para o mapa de superfície.",
    "Could not generate a valid property surface for the selected fluid.": "Não foi possível gerar uma superfície de propriedade válida para o fluido selecionado.",
    "Could not generate enough saturation points for the selected fluid.": "Não foi possível gerar pontos de saturação suficientes para o fluido selecionado.",
    "Invalid saturation range for the selected fluid.": "Intervalo de saturação inválido para o fluido selecionado.",
    "Select two different fluids for the binary VLE diagram.": "Selecione dois fluidos diferentes para o diagrama VLE binário.",
    "Invalid overlap between the selected fluids.": "Sobreposição inválida entre os fluidos selecionados.",
    "Could not bracket the equilibrium temperature for this pressure.": "Não foi possível encontrar um intervalo para a temperatura de equilíbrio nesta pressão.",
    "Head loss cannot be negative, got": "A perda de carga não pode ser negativa, obtido",
    "Head loss must be positive, got": "A perda de carga deve ser positiva, obtido",
    "For Hazen-Williams the diameter must exceed 50 mm.": "No método Hazen-Williams, o diâmetro deve ser maior que 50 mm.",
    "Provide flow rate (m³/s) and/or velocity (m/s); at least one is required.": "Informe a vazão (m³/s) e/ou a velocidade (m/s); pelo menos uma delas é obrigatória.",
    "Darcy-Weisbach requires friction factor": "Darcy-Weisbach requer fator de atrito.",
    "Hazen-Williams requires roughness coefficient": "Hazen-Williams requer coeficiente de rugosidade.",
    "Fluid '{fluid}' not found": "Fluido '{fluid}' não encontrado",
    "Sum of fluid fractions should be 1.0, got": "A soma das frações dos fluidos deve ser 1, obtido",
    "Number of pressure samples": "Número de amostras de pressão",
    "Number of samples between triple and critical points": "Número de amostras entre os pontos tríplice e crítico",
    "Missing parameter(s):": "Parâmetro(s) ausente(s):",
    "All parameters must be numeric (int or float).": "Todos os parâmetros devem ser numéricos (int ou float).",
    "Field required": "Campo obrigatório.",
    "Input should be a valid number": "Informe um número válido.",
    "Input should be a valid integer": "Informe um número inteiro válido.",
    "Input should be greater than 0": "O valor deve ser maior que 0.",
    "Input should be greater than or equal to 0": "O valor deve ser maior ou igual a 0.",
    "Input should be less than 1": "O valor deve ser menor que 1.",
    "Input should be less than or equal to 1": "O valor deve ser menor ou igual a 1.",
}

METHOD_LABELS = {
    "ColebrookWhite": "Colebrook-White",
    "SwameeJain": "Swamee-Jain",
    "Haaland": "Haaland",
    "Darcy-Weisbach": "Darcy-Weisbach",
    "Hazen-Williams": "Hazen-Williams",
}

SHAPE_LABELS = {
    "circular": "Circular",
    "rectangular": "Retangular",
    "annular": "Anelar",
    "triangular": "Triangular",
    "circularCap": "Canal circular",
}

REACTOR_TYPE_LABELS = {
    "conversion_and_kinetics": "Conversão e cinética",
    "volume_and_kinetics": "Volume e cinética",
    "residence_time_and_kinetics": "Tempo de residência e cinética",
}

PROPERTY_LABELS_PT = {
    "Density": "Massa específica",
    "Specific heat": "Calor específico",
    "Viscosity": "Viscosidade",
    "Thermal conductivity": "Condutividade térmica",
    "Enthalpy": "Entalpia",
    "Entropy": "Entropia",
    "Molar mass": "Massa molar",
    "Surface tension": "Tensão superficial",
    "Pressure": "Pressão",
    "Temperature": "Temperatura",
    "Quality (vapor fraction)": "Título (fração de vapor)",
    "Internal energy": "Energia interna",
    "Speed of sound": "Velocidade do som",
    "Compressibility factor": "Fator de compressibilidade",
    "Bubble point temperature": "Temperatura do ponto de bolha",
    "Dew point temperature": "Temperatura do ponto de orvalho",
    "Bubble point pressure": "Pressão do ponto de bolha",
    "Dew point pressure": "Pressão do ponto de orvalho",
    "Critical Temperature": "Temperatura crítica",
    "Critical Pressure": "Pressão crítica",
    "Critical Density": "Massa específica crítica",
    "Triple Point Temperature": "Temperatura do ponto triplo",
    "Triple Point Pressure": "Pressão do ponto triplo",
}


def option(value: str, label: str | None = None, **extra: Any) -> dict[str, Any]:
    result = {"value": value, "label": label or value}
    result.update(extra)
    return result


def catalog_options(values: Iterable[str], labels: dict[str, str] | None = None) -> list[dict[str, Any]]:
    labels = labels or {}
    return [option(value, labels.get(value, value)) for value in values]


def translate_error_message(message: str) -> str:
    trimmed = message.strip()

    if trimmed in ERROR_TRANSLATIONS:
        return ERROR_TRANSLATIONS[trimmed]

    for source, translation in ERROR_TRANSLATIONS.items():
        if source == "Fluid '{fluid}' not found" and "Fluid '" in trimmed and " not found" in trimmed:
            return trimmed.replace("Fluid '", "Fluido '").replace(" not found", " não encontrado")
        if source in trimmed:
            return trimmed.replace(source, translation, 1)

    return trimmed


def translate_validation_error(error: dict[str, Any]) -> str:
    message = translate_error_message(str(error.get("msg", "")))
    location = [str(part) for part in error.get("loc", []) if part not in {"body", "query", "path"}]

    if location:
        return f"{' / '.join(location)}: {message}"

    return message


def translate_validation_errors(errors: Iterable[dict[str, Any]]) -> str:
    translated = [translate_validation_error(error) for error in errors]
    translated = [item for item in translated if item]
    return "; ".join(translated) if translated else "Falha na validação da requisição."


def translate_property_label(label: str) -> str:
    return PROPERTY_LABELS_PT.get(label, label)
