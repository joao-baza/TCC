from pint import UnitRegistry
import copy

DEFAULT_PRESSURE_UNIT = "psi"

# ------------------------------------------------------------------ #
#                         DADOS ESTÁTICOS                            #
# ------------------------------------------------------------------ #
_PIPING_DATA = {
    "dimensions":{
        "SCH10": {
            6: {
                "external_diameter": 10.30,
                "thickness": 1.245,
                "weight": 0.277,
                "max_pressure": None
            
            },
            8: {
                "external_diameter": 13.70,
                "thickness": 1.651,
                "weight": 0.489,
                "max_pressure": None
            },
            10: {
                "external_diameter": 17.145,
                "thickness": 1.651,
                "weight": 0.629,
                "max_pressure": None
            },
            15: {
                "external_diameter": 21.30,
                "thickness": 2.11,
                "weight": 1.00,
                "max_pressure": 350
            },
            20: {
                "external_diameter": 26.90,
                "thickness": 2.11,
                "weight": 1.29,
                "max_pressure": 350
            },
            25: {
                "external_diameter": 33.70,
                "thickness": 2.77,
                "weight": 2.11,
                "max_pressure": 350
            },
            32: {
                "external_diameter": 42.40,
                "thickness": 2.77,
                "weight": 2.71,
                "max_pressure": 600
            },
            40: {
                "external_diameter": 48.30,
                "thickness": 2.77,
                "weight": 3.11,
                "max_pressure": 600
            },
            50: {
                "external_diameter": 60.30,
                "thickness": 2.77,
                "weight": 3.93,
                "max_pressure": 820
            },
            65: {
                "external_diameter": 73.00,
                "thickness": 3.05,
                "weight": 5.26,
                "max_pressure": 750
            },
            80: {
                "external_diameter": 88.90,
                "thickness": 3.05,
                "weight": 6.46,
                "max_pressure": 610
            },
            100: {
                "external_diameter": 114.30,
                "thickness": 3.05,
                "weight": 8.37,
                "max_pressure": 480
            },
            125: {
                "external_diameter": 141.30,
                "thickness": 3.40,
                "weight": 11.56,
                "max_pressure": 430
            },
            150: {
                "external_diameter": 168.30,
                "thickness": 3.40,
                "weight": 13.83,
                "max_pressure": 365
            },
            200: {
                "external_diameter": 219.10,
                "thickness": 3.76,
                "weight": 19.97,
                "max_pressure": 305
            }
        },
        "SCH40": {
            6: {
                "external_diameter": 10.30,
                "thickness": 1.727,
                "weight": 0.364,
                "max_pressure": None
            },
            8: {
                "external_diameter": 13.70,
                "thickness": 2.235,
                "weight": 0.673,
                "max_pressure": None
            },
            10: {
                "external_diameter": 17.145,
                "thickness": 2.31,
                "weight": 0.843,
                "max_pressure": None
            },
            15: {
                "external_diameter": 21.30,
                "thickness": 2.77,
                "weight": 1.27,
                "max_pressure": 350
            },
            20: {
                "external_diameter": 26.90,
                "thickness": 2.87,
                "weight": 1.69,
                "max_pressure": 350
            },
            25: {
                "external_diameter": 33.70,
                "thickness": 3.38,
                "weight": 2.50,
                "max_pressure": 350
            },
            32: {
                "external_diameter": 42.40,
                "thickness": 3.56,
                "weight": 3.39,
                "max_pressure": 600
            },
            40: {
                "external_diameter": 48.30,
                "thickness": 3.68,
                "weight": 4.05,
                "max_pressure": 600
            },
            50: {
                "external_diameter": 60.30,
                "thickness": 3.91,
                "weight": 4.44,
                "max_pressure": 1150
            },
            65: {
                "external_diameter": 73.00,
                "thickness": 5.16,
                "weight": 8.63,
                "max_pressure": 1250
            },
            80: {
                "external_diameter": 88.90,
                "thickness": 5.49,
                "weight": 11.29,
                "max_pressure": 965
            },
            100: {
                "external_diameter": 114.30,
                "thickness": 6.02,
                "weight": 16.07,
                "max_pressure": 750
            },
            125: {
                "external_diameter": 141.30,
                "thickness": 6.55,
                "weight": 21.77,
                "max_pressure": 835
            },
            150: {
                "external_diameter": 168.30,
                "thickness": 7.11,
                "weight": 28.26,
                "max_pressure": 760
            },
            200: {
                "external_diameter": 219.10,
                "thickness": 8.18,
                "weight": 42.55,
                "max_pressure": 670
            }
        },
        "SCH80": {
            6: {
                "external_diameter": 10.30,
                "thickness": 2.413,
                "weight": 0.468,
                "max_pressure": None
            },
            8: {
                "external_diameter": 13.70,
                "thickness": 3.023,
                "weight": 0.794,
                "max_pressure": None
            },
            10: {
                "external_diameter": 17.145,
                "thickness": 3.20,
                "weight": 1.098,
                "max_pressure": None
            },
            50: {
                "external_diameter": 60.30,
                "thickness": 5.54,
                "weight": 7.48,
                "max_pressure": 1250
            },
            65: {
                "external_diameter": 73.00,
                "thickness": 7.01,
                "weight": 11.41,
                "max_pressure": 1250
            },
            80: {
                "external_diameter": 88.90,
                "thickness": 7.62,
                "weight": 15.27,
                "max_pressure": 1250
            },
            100: {
                "external_diameter": 114.30,
                "thickness": 8.56,
                "weight": 23.32,
                "max_pressure": 1350
            },
            125: {
                "external_diameter": 141.30,
                "thickness": 9.52,
                "weight": 30.94,
                "max_pressure": 1215
            },
            150: {
                "external_diameter": 168.30,
                "thickness": 10.97,
                "weight": 42.56,
                "max_pressure": 1175
            },
            200: {
                "external_diameter": 219.10,
                "thickness": 12.70,
                "weight": 64.64,
                "max_pressure": 1045
            }
        }
    },
    "composition":{
        "Aço comercial":{
            "roughness":0.06,
            "roughness_coefficient": 135
        },
        "Aço galvanizado":{
            "roughness":0.16,
            "roughness_coefficient": 125
        },
        "Aço levemente enferrujado":{
            "roughness":0.25,
            "roughness_coefficient": None
        },
        "Aço revestido com asfalto":{
            "roughness":0.6,
            "roughness_coefficient": None
        },
        "Aço revestido com esmalte, vinil ou epóxi":{
            "roughness":0.06,
            "roughness_coefficient": None
        },
        "Alumínio":{
            "roughness":0.004,
            "roughness_coefficient": None
        },
        "Concreto muito rugoso":{
            "roughness":2000,
            "roughness_coefficient": 120                
        },
        "Concreto rugoso":{
            "roughness":0.5,
            "roughness_coefficient": 120                
        },
        "Concreto liso":{
            "roughness":0.1,
            "roughness_coefficient": 120                
        },
        "Concreto muito liso":{
            "roughness":0.06,
            "roughness_coefficient": 120                
        },
        "Concreto alisado ou centrifugado":{
            "roughness":0.3,
            "roughness_coefficient": 120                
        },
        "Ferro fundido asfaltado":{
            "roughness":0.122,
            "roughness_coefficient": 130
        },
        "Ferro fundido novo sem revestimento":{
            "roughness":0.5,
            "roughness_coefficient": 125
        },
        "Ferro fundido levemente enferrujado":{
            "roughness":1.5,
            "roughness_coefficient": 90
        },
        "Ferro fundido revestido com cimento centrifugado":{
            "roughness":0.1,
            "roughness_coefficient": None
        },
        "Fibrocimento":{
            "roughness":0.1,
            "roughness_coefficient": None
        },
        "Tubo cerâmico":{
            "roughness":0.6,
            "roughness_coefficient": None
        },
        "Latão e cobre":{
            "roughness":0.007,
            "roughness_coefficient": 130
        },
        "Plásticos":{
            "roughness":0.06,
            "roughness_coefficient": 140
        }
    },
        "fittings": {
        "Retorno 180°": {
            "equivalentLength": 28
            },
        "Cotovelo 90° raio longo": {
            "equivalentLength": 16
            },
        "Cotovelo 90° raio curto": {
            "equivalentLength": 20
            },
        "Cotovelo 45°": {
            "equivalentLength": 16
            },
        "Tê (passagem reta)": {
            "equivalentLength": 20
            },
        "Tê (saída lateral)": {
            "equivalentLength": 65
            },
        "Saída de tanque": {
            "equivalentLength": 32
            },
        "Válvula diafragma": {
            "equivalentLength": 200
            },
        "Válvula esfera": {
            "equivalentLength": 18
            },
        "Filtro em Y": {
            "equivalentLength": 250
            },
        "Válvula gaveta (totalmente aberta)": {
            "equivalentLength": 13
            },
        "Válvula gaveta (3/4 aberta)": {
            "equivalentLength": 35
            },
        "Válvula gaveta (meio aberta)": {
            "equivalentLength": 160
            },
        "Válvula gaveta (1/4 aberta)": {
            "equivalentLength": 900
            },
        "Válvula retenção de pé": {
            "equivalentLength": 150
            },
        "Válvula retenção de porta": {
            "equivalentLength": 135
            },
        "Válvula agulha": {
            "equivalentLength": 1000
            },
        "Válvula globo (aberta)": {
            "equivalentLength": 300
            },
        "Válvula borboleta": {
            "equivalentLength": 20
            },
        "Cotovelo 90° raio médio": {
            "equivalentLength": 28.5
            },
        "Cotovelo 45° (personalizado)": {
            "equivalentLength": 15.4
            },
        "Curva 90° R/D = 1,5": {
            "equivalentLength": 12.8
            },
        "Curva 90° R/D = 1": {
            "equivalentLength": 17.5
            },
        "Curva 45°": {
            "equivalentLength": 7.8
            },
        "Entrada normal": {
            "equivalentLength": 14.7
            },
        "Entrada lateral": {
            "equivalentLength": 30.2
            },
        "Válvula angular aberta": {
            "equivalentLength": 171.5
            },
        "Tê 90° dupla saída": {
            "equivalentLength": 69
            },
        "Válvula retenção, leve": {
            "equivalentLength": 83.6}
    }

}

class Piping:
    def __init__(self):
        """
        Contém especificações de tubulação.
        Cada chave numérica é o diâmetro nominal em mm, com os campos:
        ----external_diameter: mm
        ----thickness: mm
        ----weight: kg/m
        ----pressure: psi
        """
        
        self.ureg = UnitRegistry()
        # Referência aos dados estáticos (uso somente leitura)
        self.data = _PIPING_DATA

    def fittings(self):
        """        
        Retorna os acessórios de tubulação disponíveis.
        """
        return list(self.data["fittings"].keys())
        
    def fitting_specifications(self, fitting):
        """        
        Retorna as especificações do acessório com detalhes adicionais.
        """
        if fitting not in self.data["fittings"]:
            raise TypeError("Acessório não encontrado")
            
        # Obtém especificações básicas (cópia para evitar mutação)
        specs = copy.deepcopy(self.data["fittings"][fitting])
        
        specs["equivalentLength"] = specs["equivalentLength"] * self.ureg.dimensionless

        # Adiciona detalhes complementares
        enhanced_specs = {
            "name": fitting,
            "description": self._get_fitting_description(fitting),
            "usage": self._get_fitting_usage(fitting),
            "specifications": specs
        }
        
        return enhanced_specs
    
    def compositions(self):
        """        
        Retorna as composições de tubulação disponíveis.
        """
        return list(self.data["composition"].keys())
    
    def composition_specifications(self, composition):
        """        
        Retorna as especificações da composição com detalhes adicionais.
        """
        if composition not in self.data["composition"]:
            raise TypeError("Composição não encontrada")
            
        # Obtém especificações básicas
        specs = copy.deepcopy(self.data["composition"][composition])
        
        # Aplica unidades
        specs["roughness"] = specs["roughness"] * self.ureg.mm
        if specs.get("roughness_coefficient"):
            specs["roughness_coefficient"] = specs["roughness_coefficient"] * self.ureg.dimensionless
        
        # Adiciona detalhes complementares
        enhanced_specs = {
            "name": composition,
            "description": self._get_composition_description(composition),
            "applications": self._get_composition_applications(composition),
            "specifications": specs
        }
        
        return enhanced_specs
    
    def schedules(self):
        """        
        Retorna os schedules de tubulação com diâmetros disponíveis.
        """
        result = []
        for schedule in list(self.data["dimensions"].keys()):
            result.append({
                "name": schedule,
                "diameters": list(self.data["dimensions"][schedule].keys()),
                "description": self._get_schedule_description(schedule)
            })
        return result
    
    def diameters(self, schedule_key):
        """        
        Retorna os diâmetros com informações básicas para o schedule informado.
        """
        if schedule_key not in self.data["dimensions"]:
            raise TypeError("Schedule não encontrado")
            
        diameters_dict = {}
        for diameter in list(self.data["dimensions"][schedule_key].keys()):
            specs = self.data["dimensions"][schedule_key][diameter]
            diameters_dict[diameter] = {
                "nominal_diameter": diameter,
                "external_diameter": specs["external_diameter"], # valor bruto em mm
                "units": "mm"
            }
            
        return diameters_dict
        
    def diameter_specifications(self, schedule_key, diameter_nominal):
        """        
        Retorna os dados da tubulação para o schedule e diâmetro nominal informados (mm).
        """
        if schedule_key not in self.data["dimensions"]:
            raise TypeError("Schedule não encontrado")
        if diameter_nominal not in self.data["dimensions"][schedule_key]:
            raise TypeError("Diâmetro nominal não encontrado")
            
        # Obtém e copia especificações para aplicar unidades
        specs = copy.deepcopy(self.data["dimensions"][schedule_key][diameter_nominal])
        
        specs["external_diameter"] = specs["external_diameter"] * self.ureg.mm
        specs["thickness"] = specs["thickness"] * self.ureg.mm
        specs["weight"] = specs["weight"] * (self.ureg.kg / self.ureg.m)
        
        if specs["max_pressure"] is not None:
             # Valores de pressão no dicionário estão em psi
            p = specs["max_pressure"] * self.ureg(DEFAULT_PRESSURE_UNIT)
            specs["max_pressure"] = p.to(self.ureg.Pa)
            
        return specs
    
    def _get_fitting_description(self, fitting):
        """Fornece uma descrição para o acessório informado."""
        descriptions = {
            "Retorno 180°": "Acessório em U que inverte o sentido do escoamento em 180 graus.",
            "Cotovelo 90° raio longo": "Cotovelo de grande raio que desvia o escoamento em 90 graus com menor perda de carga.",
            "Cotovelo 90° raio curto": "Cotovelo compacto que desvia o escoamento em 90 graus com maior perda de carga.",
            "Cotovelo 45°": "Cotovelo que desvia o escoamento em 45 graus.",
            "Tê (passagem reta)": "Acessório em T com continuidade do escoamento pelo ramal principal.",
            "Tê (saída lateral)": "Acessório em T com desvio do escoamento pela saída lateral.",
            "Saída de tanque": "Acessório que conecta um tanque ao sistema de tubulação.",
            "Válvula diafragma": "Válvula que utiliza um diafragma flexível para controlar o escoamento.",
            "Válvula esfera": "Válvula com esfera pivotante para controle do escoamento, com baixa perda de carga quando totalmente aberta."
        }
        
        return descriptions.get(fitting, "Acessório utilizado em sistemas de transporte de fluidos.")
    
    def _get_fitting_usage(self, fitting):
        """Fornece informações de uso para o acessório informado."""
        usages = {
            "Retorno 180°": "Utilizado em espaços reduzidos onde é necessária a inversão completa do escoamento.",
            "Cotovelo 90° raio longo": "Preferido em altas vazões e para minimizar perda de carga em mudanças de direção.",
            "Cotovelo 90° raio curto": "Utilizado quando o espaço é limitado e as vazões são moderadas.",
            "Cotovelo 45°": "Utilizado para mudanças graduais de direção, reduzindo a perda de carga.",
            "Tê (passagem reta)": "Utilizado para criar derivações mantendo o escoamento no ramal principal.",
            "Tê (saída lateral)": "Utilizado para desviar parte do escoamento para um ramal derivado.",
            "Saída de tanque": "Utilizado para conectar tanques de armazenamento a sistemas de tubulação.",
            "Válvula diafragma": "Utilizada para controle preciso do escoamento e isolamento em aplicações sanitárias.",
            "Válvula esfera": "Utilizada para fechamento rápido com baixa perda de carga."
        }
        
        return usages.get(fitting, "Comum em sistemas de tubulação industrial e comercial.")
    
    def _get_composition_description(self, composition):
        """Fornece uma descrição para a composição informada."""
        descriptions = {
            "Aço comercial": "Tubulação de aço carbono padrão, utilizada em diversas aplicações industriais.",
            "Aço galvanizado": "Tubulação de aço revestida com zinco para prevenir corrosão.",
            "Aço levemente enferrujado": "Tubulação de aço com oxidação superficial leve.",
            "Aço revestido com asfalto": "Tubulação de aço revestida com asfalto para proteção contra corrosão em instalações enterradas.",
            "Aço revestido com esmalte, vinil ou epóxi": "Tubulação de aço com revestimento especial para resistência química.",
            "Alumínio": "Tubulação metálica leve com boa resistência à corrosão.",
            "Concreto muito rugoso": "Tubulação de concreto com alta rugosidade superficial.",
            "Concreto liso": "Tubulação de concreto com baixa rugosidade superficial.",
            "Latão e cobre": "Tubulação metálica com excelente condutividade térmica e resistência a incrustações biológicas.",
            "Plásticos": "Tubulação polimérica com excelente resistência química e baixo peso."
        }
        
        return descriptions.get(composition, "Material utilizado em tubulações de transporte de fluidos.")
    
    def _get_composition_applications(self, composition):
        """Fornece informações de aplicação para a composição informada."""
        applications = {
            "Aço comercial": "Transporte de água, gás, óleo e vapor em ambientes industriais.",
            "Aço galvanizado": "Sistemas de água potável, sprinklers e irrigação.",
            "Aço revestido com asfalto": "Tubulações enterradas de água e esgoto.",
            "Aço revestido com esmalte, vinil ou epóxi": "Processos químicos e ambientes corrosivos.",
            "Alumínio": "Ar comprimido, refrigeração e sistemas de irrigação.",
            "Concreto": "Transporte de água em grandes diâmetros, esgoto e drenagem.",
            "Latão e cobre": "Água potável, aquecimento, refrigeração e gases medicinais.",
            "Plásticos": "Processos químicos, tratamento de água, irrigação e aplicações de baixa pressão."
        }
        
        return applications.get(composition, "Diversas aplicações de transporte de fluidos conforme as propriedades do material.")
    
    def _get_schedule_description(self, schedule):
        """Fornece uma descrição para o schedule informado."""
        descriptions = {
            "SCH10": "Schedule de baixa espessura, adequado para aplicações de baixa pressão.",
            "SCH40": "Schedule padrão utilizado na maioria das aplicações comerciais e industriais.",
            "SCH80": "Schedule de alta espessura para aplicações de alta pressão."
        }
        
        return descriptions.get(schedule, "Especificação padronizada para dimensões de tubulações.")
