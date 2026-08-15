# Catalog Name pt-BR Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate all 526 unique P&ID symbol names from en-US to pt-BR across both catalog files, preserving English originals in aliases.

**Architecture:** A standalone post-generation Python script (`scripts/translate_catalog.py`) reads a JSON translation dictionary (`scripts/catalog_translations.json`), transforms the two generated catalog files in-place, and validates output integrity.

**Tech Stack:** Python 3 (stdlib only — `json`, `sys`, `pathlib`), no dependencies.

---

### Task 1: Create the translation dictionary

**Files:**
- Create: `scripts/catalog_translations.json`

- [ ] **Step 1: Write the complete translation dictionary**

```json
{
  "3 Way Valve": "Válvula de 3 Vias",
  "3 Way Valve (Manual)": "Válvula de 3 Vias (Manual)",
  "AC Air Compressor": "Compressor de Ar CA",
  "Aerator With Sparger": "Aerador com Difusor",
  "Agitator (Anchor)": "Agitador (Âncora)",
  "Agitator (Cross-Beam)": "Agitador (Viga Cruzada)",
  "Agitator (Disc)": "Agitador (Disco)",
  "Agitator (Flate-Blade Paddle)": "Agitador (Pá de Lâmina Plana)",
  "Agitator (Gat Paddle)": "Agitador (Pá Gat)",
  "Agitator (Helical)": "Agitador (Helicoidal)",
  "Agitator (Impeller)": "Agitador (Impulsor)",
  "Agitator (Propeller)": "Agitador (Hélice)",
  "Agitator (Turbine)": "Agitador (Turbina)",
  "Agitator, Stirrer": "Agitador, Misturador",
  "Air Cooler": "Resfriador a Ar",
  "Air Filter": "Filtro de Ar",
  "Air Separator": "Separador de Ar",
  "Analyzer Transmitter": "Transmissor Analisador",
  "Angle": "Ângulo",
  "Angle Blowdown Valve": "Válvula Angular de Purga",
  "Angle Globe Valve": "Válvula Globo Angular",
  "Angle Globe Valve (Manual)": "Válvula Globo Angular (Manual)",
  "Angle Valve": "Válvula Angular",
  "Angle Valve (Manual)": "Válvula Angular (Manual)",
  "Auto Recirculation Valve": "Válvula de Recirculação Automática",
  "Averging Pitot Tube": "Tubo Pitot de Média",
  "Back Draft Damper": "Registro de Contracorrente",
  "Back Draft Damper2": "Registro de Contracorrente 2",
  "Back Pressure Regulator 1": "Regulador de Contrapressão 1",
  "Back Pressure Regulator 2": "Regulador de Contrapressão 2",
  "Bag": "Saco",
  "Bag (ISO)": "Saco (ISO)",
  "Bag Filling Machine": "Máquina de Enchimento de Sacos",
  "Bag Filling Machine2": "Máquina de Enchimento de Sacos 2",
  "Ball Valve": "Válvula de Esfera",
  "Barrel, Drum": "Barril, Tambor",
  "Barrel, Drum (ISO)": "Barril, Tambor (ISO)",
  "Basket Strainer": "Filtro Cesto",
  "Belt Skimmer": "Recuperador de Correia",
  "Bin": "Caçamba",
  "Blank": "Flange Cega",
  "Blank2": "Flange Cega 2",
  "Bleeder Valve 1": "Válvula de Sangria 1",
  "Bleeder Valve 2": "Válvula de Sangria 2",
  "Blind Disc": "Disco Cego",
  "Blind Disc2": "Disco Cego 2",
  "Blower, Fan": "Soprador, Ventilador",
  "Boiler (Dome)": "Caldeira (Domos)",
  "Boiler (Dome, Hot Liquid)": "Caldeira (Domos, Líquido Quente)",
  "Box Truck": "Caminhão Baú",
  "Breakthrough": "Rompimento de Disco",
  "Breakthrough2": "Rompimento de Disco 2",
  "Breather": "Respiro",
  "Bucket Elevator": "Elevador de Caçambas",
  "Bunker (Conical Bottom)": "Silo (Fundo Cônico)",
  "Butterfly Valve": "Válvula Borboleta",
  "Butterfly Valve 1": "Válvula Borboleta 1",
  "Butterfly Valve 2": "Válvula Borboleta 2",
  "Cap": "Tampão",
  "Cavity Pump": "Bomba de Cavidade",
  "Centrifugal": "Centrífugo",
  "Centrifugal Compressor": "Compressor Centrífugo",
  "Centrifugal Compressor - Turbine Driven": "Compressor Centrífugo Acionado por Turbina",
  "Centrifugal Pump 1": "Bomba Centrífuga 1",
  "Centrifugal Pump 2": "Bomba Centrífuga 2",
  "Centrifugal Pump 3": "Bomba Centrífuga 3",
  "Centrifuge (High Speed)": "Centrífuga (Alta Velocidade)",
  "Centrifuge (Perforated Shell)": "Centrífuga (Cesto Perfurado)",
  "Centrifuge (Pusher)": "Centrífuga (Empurrador)",
  "Centrifuge (Screw, Perforated Shell)": "Centrífuga (Rosca, Cesto Perfurado)",
  "Centrifuge (Separator Disc)": "Centrífuga (Disco Separador)",
  "Centrifuge (Skimmer)": "Centrífuga (Escumador)",
  "Centrifuge (Solid Shell)": "Centrífuga (Cesto Sólido)",
  "Centrifuge, Decanter (Screw, Solid Shell)": "Centrífuga Decantadora (Rosca, Cesto Sólido)",
  "Check Valve": "Válvula de Retenção",
  "Check Valve 1": "Válvula de Retenção 1",
  "Check Valve 2": "Válvula de Retenção 2",
  "Chiller": "Resfriador",
  "Clamped Flange Coupling": "Acoplamento de Flange Apertado",
  "Closed Figure 8 Blind": "Oito Cego Fechado",
  "Closed Figure 8 Blind2": "Oito Cego Fechado 2",
  "Column": "Coluna",
  "Column (Bubble Cap Trays)": "Coluna (Pratos com Campânulas)",
  "Column (Fixed Bed)": "Coluna (Leito Fixo)",
  "Column (Fixed Bed, Spray Nozzle)": "Coluna (Leito Fixo, Bico Aspersor)",
  "Column (Fluidized Bed)": "Coluna (Leito Fluidizado)",
  "Column (Staggered Baffle Trays)": "Coluna (Pratos com Defletores Alternados)",
  "Column (Tray)": "Coluna (Prato)",
  "Column (Valve Trays)": "Coluna (Pratos Valvulados)",
  "Combustion Chamber": "Câmara de Combustão",
  "Compensator": "Compensador",
  "Compressor": "Compressor",
  "Compressor (Centrifugal)": "Compressor (Centrífugo)",
  "Compressor (Diaphragm)": "Compressor (Diafragma)",
  "Compressor (Ejector)": "Compressor (Ejetor)",
  "Compressor (Piston)": "Compressor (Pistão)",
  "Compressor (Ring)": "Compressor (Anel)",
  "Compressor (Roller Vane)": "Compressor (Palhetas Rotativas)",
  "Compressor (Rotary)": "Compressor (Rotativo)",
  "Compressor (Screw)": "Compressor (Rosca)",
  "Compressor (Turbo)": "Compressor (Turbo)",
  "Compressor and Silencers": "Compressor e Silenciadores",
  "Compressor, Vacuum Pump": "Compressor, Bomba de Vácuo",
  "Computer Function (control room)": "Função de Computador (sala de controle)",
  "Computer Function (field)": "Função de Computador (campo)",
  "Computer Function (inaccessible)": "Função de Computador (inacessível)",
  "Computer Function (local panel)": "Função de Computador (painel local)",
  "Concentric Reducer": "Redução Concêntrica",
  "Concrete Tank": "Tanque de Concreto",
  "Condenser": "Condensador",
  "Cone Strainer": "Filtro Cônico",
  "Container (Solids, Liquids, Gases)": "Contêiner (Sólidos, Líquidos, Gases)",
  "Container, Tank, Cistern": "Contêiner, Tanque, Cisterna",
  "Container, Tank, Cistern (Boot)": "Contêiner, Tanque, Cisterna (Saia)",
  "Container, Tank, Cistern (Bottom)": "Contêiner, Tanque, Cisterna (Fundo)",
  "Container, Tank, Cistern (Legs)": "Contêiner, Tanque, Cisterna (Pernas)",
  "Conveyor": "Transportador",
  "Conveyor (Belt)": "Transportador (Correia)",
  "Conveyor (Belt, Closed)": "Transportador (Correia, Fechado)",
  "Conveyor (Belt, Closed, Reversible)": "Transportador (Correia, Fechado, Reversível)",
  "Conveyor (Belt, Closed, Reversible)2": "Transportador (Correia, Fechado, Reversível) 2",
  "Conveyor (Chain, Closed)": "Transportador (Corrente, Fechado)",
  "Conveyor (Screw, Closed)": "Transportador (Rosca, Fechado)",
  "Conveyor (Vibrating, Closed)": "Transportador (Vibratório, Fechado)",
  "Conveyor (Vibrating, Closed)2": "Transportador (Vibratório, Fechado) 2",
  "Conveyor2": "Transportador 2",
  "Cooler": "Resfriador",
  "Cooling Tower": "Torre de Resfriamento",
  "Cooling Tower (Dry, Forced Draught)": "Torre de Resfriamento (Seca, Tiragem Forçada)",
  "Cooling Tower (Dry, Induced Draught)": "Torre de Resfriamento (Seca, Tiragem Induzida)",
  "Cooling Tower (Dry, Natural Draught)": "Torre de Resfriamento (Seca, Tiragem Natural)",
  "Cooling Tower (Wet, Forced Draught)": "Torre de Resfriamento (Úmida, Tiragem Forçada)",
  "Cooling Tower (Wet, Induced Draught)": "Torre de Resfriamento (Úmida, Tiragem Induzida)",
  "Cooling Tower (Wet, Natural Draught)": "Torre de Resfriamento (Úmida, Tiragem Natural)",
  "Cooling Tower (Wet-Dry, Natural Draught)": "Torre de Resfriamento (Úmida-Seca, Tiragem Natural)",
  "Coriolis": "Coriolis",
  "Coupling": "Acoplamento",
  "Covered Gas Vent": "Ventilação de Gás Coberta",
  "Crane": "Guindaste",
  "Crusher": "Britador",
  "Crusher (Cone)": "Britador (Cone)",
  "Crusher (Hammer)": "Britador (Martelo)",
  "Crusher (Impact)": "Britador (Impacto)",
  "Crusher (Jaw)": "Britador (Mandíbula)",
  "Crusher (Roller)": "Britador (Rolos)",
  "Crushing, Grinding Machine": "Máquina de Britagem, Moagem",
  "Curved Gas Vent": "Ventilação de Gás Curva",
  "Cyclone": "Ciclone",
  "Damper": "Registro",
  "Damper2": "Registro 2",
  "Desuper Heater": "Dessuperaquecedor",
  "Detonation Arrestor": "Corta-Chamas de Detonação",
  "Diaphragm": "Diafragma",
  "Discrete Instrument (control room)": "Instrumento Discreto (sala de controle)",
  "Discrete Instrument (field)": "Instrumento Discreto (campo)",
  "Discrete Instrument (inaccessible)": "Instrumento Discreto (inacessível)",
  "Discrete Instrument (local panel)": "Instrumento Discreto (painel local)",
  "Diverter Valve": "Válvula Desviadora",
  "Double Concrete Tank": "Tanque de Concreto Duplo",
  "Double Flange": "Flange Duplo",
  "Double Pipe Heat Exchanger": "Trocador de Calor de Tubo Duplo",
  "Drier": "Secador",
  "Drier (Fluidized Bed)": "Secador (Leito Fluidizado)",
  "Drier (Roller Conveyor Belt)": "Secador (Correia Transportadora de Rolos)",
  "Drum or Condenser": "Tambor ou Condensador",
  "Dryer": "Secador",
  "Drying Oven, Drying Chamber, Shelf Dryer": "Estufa de Secagem, Câmara de Secagem, Secador de Bandejas",
  "Duplex Strainer": "Filtro Duplex",
  "Eccentric Reducer": "Redução Excêntrica",
  "Eccentric Worm": "Fuso Excêntrico",
  "Electric Heater": "Aquecedor Elétrico",
  "Electric Motor": "Motor Elétrico",
  "Electric Motor (AC)": "Motor Elétrico (CA)",
  "Electric Motor (DC)": "Motor Elétrico (CC)",
  "Electromagnetic": "Eletromagnético",
  "Elevator (Bucket)": "Elevador (Caçambas)",
  "Elevator (Bucket, Z-Form)": "Elevador (Caçambas, Forma Z)",
  "Excess Flow Valve": "Válvula de Excesso de Fluxo",
  "Excess Flow Valve2": "Válvula de Excesso de Fluxo 2",
  "Exhaust Head": "Cabeçote de Exaustão",
  "Expansion Joint": "Junta de Expansão",
  "Extruder (Piston)": "Extrusora (Pistão)",
  "Extruder (Screw)": "Extrusora (Rosca)",
  "Fan": "Ventilador",
  "Fan 2": "Ventilador 2",
  "Feed Pump": "Bomba de Alimentação",
  "Feeder (Rotary Table)": "Alimentador (Mesa Rotativa)",
  "Filter": "Filtro",
  "Filter 2": "Filtro 2",
  "Firing System, Burner": "Sistema de Ignição, Queimador",
  "Fixed Straight Tubes Heat Exchanger": "Trocador de Calor de Tubos Retos Fixos",
  "Flame Arrestor": "Corta-Chamas",
  "Flame Arrestor (Detonation-Proof)": "Corta-Chamas (À Prova de Detonação)",
  "Flame Arrestor (Explosion-Proof)": "Corta-Chamas (À Prova de Explosão)",
  "Flame Arrestor (Fire-Resistant)": "Corta-Chamas (Resistente ao Fogo)",
  "Flame Arrestor (Fire-Resistant, Detonation-Proof)": "Corta-Chamas (Resistente ao Fogo, À Prova de Detonação)",
  "Flange": "Flange",
  "Flange In": "Flange de Entrada",
  "Flanged Connection": "Conexão Flangeada",
  "Flanged Dummy Cover": "Tampão Flangeado",
  "Flexible Hose": "Mangueira Flexível",
  "Flexible Pipe": "Tubo Flexível",
  "Flow Element": "Elemento de Fluxo",
  "Flow Indicator": "Indicador de Vazão",
  "Flow Nozzle": "Bocal de Vazão",
  "Flow Recorder": "Registrador de Vazão",
  "Flow Transmitter": "Transmissor de Vazão",
  "Flume": "Calha",
  "Forced Flow Air Cooler": "Resfriador a Ar de Fluxo Forçado",
  "Forced-Draft Cooling Tower": "Torre de Resfriamento de Tiragem Forçada",
  "Forklift (Manual)": "Empilhadeira (Manual)",
  "Forklift (Truck)": "Empilhadeira (Caminhão)",
  "Four Way Valve": "Válvula de 4 Vias",
  "Funnel": "Funil",
  "Furnace": "Forno",
  "Furnace2": "Forno 2",
  "Gas Blower": "Soprador de Gás",
  "Gas Bottle": "Cilindro de Gás",
  "Gas Compressor": "Compressor de Gás",
  "Gas Filter": "Filtro de Gás",
  "Gas Filter (Bag, Candle, Cartridge)": "Filtro de Gás (Saco, Vela, Cartucho)",
  "Gas Filter (Belt, Roll)": "Filtro de Gás (Correia, Rolo)",
  "Gas Filter (Fixed Bed)": "Filtro de Gás (Leito Fixo)",
  "Gas Filter (HEPA)": "Filtro de Gás (HEPA)",
  "Gas Flare": "Queimador de Gás (Flare)",
  "Gas Holder": "Gasômetro",
  "Gate Valve": "Válvula Gaveta",
  "Gate Valve (Balanced Diaphragm)": "Válvula Gaveta (Diafragma Balanceado)",
  "Gate Valve (Diaphragm)": "Válvula Gaveta (Diafragma)",
  "Gate Valve (Digital)": "Válvula Gaveta (Digital)",
  "Gate Valve (Double Acting Cylinder)": "Válvula Gaveta (Cilindro de Dupla Ação)",
  "Gate Valve (Electro-Hydraulic)": "Válvula Gaveta (Eletro-Hidráulica)",
  "Gate Valve (Key)": "Válvula Gaveta (Chave)",
  "Gate Valve (Manual)": "Válvula Gaveta (Manual)",
  "Gate Valve (Motor)": "Válvula Gaveta (Motor)",
  "Gate Valve (Pilot)": "Válvula Gaveta (Piloto)",
  "Gate Valve (Powered)": "Válvula Gaveta (Motorizada)",
  "Gate Valve (Single Acting Cylinder)": "Válvula Gaveta (Cilindro de Ação Simples)",
  "Gate Valve (Solenoid With Manual Reset)": "Válvula Gaveta (Solenoide com Reinicialização Manual)",
  "Gate Valve (Solenoid)": "Válvula Gaveta (Solenoide)",
  "Gate Valve (Spring)": "Válvula Gaveta (Mola)",
  "Gate Valve (Weight)": "Válvula Gaveta (Peso)",
  "Gauge": "Manômetro",
  "Gear": "Engrenagem",
  "Gear Pump": "Bomba de Engrenagem",
  "Generator": "Gerador",
  "Generator (AC)": "Gerador (CA)",
  "Generator (DC)": "Gerador (CC)",
  "Globe Valve": "Válvula Globo",
  "Gravity Separator, Settling Chamber": "Separador por Gravidade, Câmara de Decantação",
  "Gravity Separator, Settling Chamber2": "Separador por Gravidade, Câmara de Decantação 2",
  "Hairpin Exchanger": "Trocador em Grampo",
  "Half Pipe Mixing Vessel": "Vaso de Mistura Meia-Cana",
  "Heat Consumer": "Consumidor de Calor",
  "Heat Exchanger (Coil Tubes)": "Trocador de Calor (Tubos em Serpentina)",
  "Heat Exchanger (Finned Tubes)": "Trocador de Calor (Tubos Aletados)",
  "Heat Exchanger (Finned Tubes, Fan)": "Trocador de Calor (Tubos Aletados, Ventilador)",
  "Heat Exchanger (Floating Head)": "Trocador de Calor (Cabeçote Flutuante)",
  "Heat Exchanger (Plate)": "Trocador de Calor (Placas)",
  "Heat Exchanger (Spiral)": "Trocador de Calor (Espiral)",
  "Heat Exchanger (Straight Tubes)": "Trocador de Calor (Tubos Retos)",
  "Heater": "Aquecedor",
  "Horizontal Pump": "Bomba Horizontal",
  "Hose": "Mangueira",
  "Hose Connection": "Conexão de Mangueira",
  "Hydraulic": "Hidráulico",
  "Hydraulic Valve": "Válvula Hidráulica",
  "Impact Separator": "Separador de Impacto",
  "In-Line Mixer": "Misturador em Linha",
  "In-Line Rotary Mixer": "Misturador Rotativo em Linha",
  "In-Line Silencer": "Silenciador em Linha",
  "In-Line Static Mixer": "Misturador Estático em Linha",
  "Indicator (Control)": "Indicador (Controle)",
  "Indicator (Function)": "Indicador (Função)",
  "Indicator (Instrument)": "Indicador (Instrumento)",
  "Indicator (PLC)": "Indicador (CLP)",
  "Induced Flow Air Cooler": "Resfriador a Ar de Fluxo Induzido",
  "Induced-Draft Cooling Tower": "Torre de Resfriamento de Tiragem Induzida",
  "Industrial Truck": "Caminhão Industrial",
  "Injector": "Injetor",
  "Integrated Block and Bleed Valve": "Válvula Integrada de Bloqueio e Sangria",
  "Integrated Block and Bleed Valve (Manual)": "Válvula Integrada de Bloqueio e Sangria (Manual)",
  "Interchangeable Disc (Blind Disc)": "Disco Intercambiável (Disco Cego)",
  "Interchangeable Disc (Blind Disc)2": "Disco Intercambiável (Disco Cego) 2",
  "Interchangeable Disc (Open Disc In Function)": "Disco Intercambiável (Disco Aberto em Função)",
  "Interchangeable Disc (Open Disc In Function)2": "Disco Intercambiável (Disco Aberto em Função) 2",
  "Jacketed Mixing Vessel": "Vaso de Mistura Encaçapado",
  "Jet Pump (Liquid)": "Bomba a Jato (Líquido)",
  "Kneader": "Misturador de Massa",
  "Knife Valve": "Válvula Faca",
  "Knock-out Drum": "Tambor Separador",
  "Level Alarm": "Alarme de Nível",
  "Level Controller 1": "Controlador de Nível 1",
  "Level Controller 2": "Controlador de Nível 2",
  "Level Gauge": "Indicador de Nível",
  "Level Indicator": "Indicador de Nível",
  "Level Recorder": "Registrador de Nível",
  "Level Transmitter 1": "Transmissor de Nível 1",
  "Level Transmitter 2": "Transmissor de Nível 2",
  "Lift": "Elevador",
  "Liquid Filter": "Filtro de Líquido",
  "Liquid Filter (Bag, Candle, Cartridge)": "Filtro de Líquido (Saco, Vela, Cartucho)",
  "Liquid Filter (Belt, Roll)": "Filtro de Líquido (Correia, Rolo)",
  "Liquid Filter (Biological)": "Filtro de Líquido (Biológico)",
  "Liquid Filter (Fixed Bed)": "Filtro de Líquido (Leito Fixo)",
  "Liquid Filter (Ion Exchanger)": "Filtro de Líquido (Trocador Iônico)",
  "Liquid Filter (Rotary, Drum or Disc)": "Filtro de Líquido (Rotativo, Tambor ou Disco)",
  "Liquid Filter (Rotary, Drum or Disc, Scraper)": "Filtro de Líquido (Rotativo, Tambor ou Disco, Raspador)",
  "Liquid Jet": "Jato de Líquido",
  "Liquid Ring Compressor": "Compressor de Anel Líquido",
  "Loading Arm": "Braço de Carregamento",
  "Logic (control room)": "Lógica (sala de controle)",
  "Logic (field)": "Lógica (campo)",
  "Logic (inaccessible)": "Lógica (inacessível)",
  "Logic (local panel)": "Lógica (painel local)",
  "Magnetic": "Magnético",
  "Manhole": "Boca de Visita",
  "Manual Operated Valve": "Válvula de Operação Manual",
  "Mill (Roller)": "Moinho (Rolos)",
  "Mill (Vibration)": "Moinho (Vibração)",
  "Mill (Vibration)2": "Moinho (Vibração) 2",
  "Mill, Pulverizer": "Moinho, Pulverizador",
  "Mill, Pulverizer (Hammer)": "Moinho, Pulverizador (Martelo)",
  "Mill, Pulverizer (Impact)": "Moinho, Pulverizador (Impacto)",
  "Mixer": "Misturador",
  "Mixing Path": "Caminho de Mistura",
  "Mixing Reactor": "Reator de Mistura",
  "Motor Operated Valve": "Válvula Motorizada",
  "Needle": "Agulha",
  "Needle Valve": "Válvula de Agulha",
  "Normally Closed Ball Valve": "Válvula de Esfera Normalmente Fechada",
  "Normally Closed Gate Valve": "Válvula Gaveta Normalmente Fechada",
  "Open Bulk Storage": "Armazenamento a Granel Aberto",
  "Open Disc": "Disco Aberto",
  "Open Figure 8 Blind": "Oito Cego Aberto",
  "Open Figure 8 Blind2": "Oito Cego Aberto 2",
  "Orifice": "Orifício",
  "Orifice (Quick Change)": "Orifício (Troca Rápida)",
  "Orifice Plate": "Placa de Orifício",
  "Orifice Plate2": "Placa de Orifício 2",
  "Palletizer": "Paletizador",
  "Palletizer2": "Paletizador 2",
  "Pelletizing Disc": "Disco de Peletização",
  "Peristaltic": "Peristáltico",
  "Pinch Valve": "Válvula de Pinçamento",
  "Pitot Tube": "Tubo Pitot",
  "Plate and Frame Heat Exchanger": "Trocador de Calor de Placas e Quadro",
  "Plug": "Tampão",
  "Plug Valve": "Válvula de Macho",
  "Pneumatic Operated": "Operado Pneumaticamente",
  "Pneumatic Operated Butterfly Valve": "Válvula Borboleta de Acionamento Pneumático",
  "Positive Displacement": "Deslocamento Positivo",
  "Press (Piston)": "Prensa (Pistão)",
  "Press (Roller)": "Prensa (Rolos)",
  "Press Filter": "Filtro Prensa",
  "Pressure Controller": "Controlador de Pressão",
  "Pressure Indicating Controller": "Controlador Indicador de Pressão",
  "Pressure Indicator": "Indicador de Pressão",
  "Pressure Recorder": "Registrador de Pressão",
  "Pressure Recording Controller": "Controlador Registrador de Pressão",
  "Pressure Reducing Valve": "Válvula Redutora de Pressão",
  "Pressure Transmitter 1": "Transmissor de Pressão 1",
  "Pressure Transmitter 2": "Transmissor de Pressão 2",
  "Pressurized Vessel": "Vaso Pressurizado",
  "Programmable Logic Control (control room)": "Controlador Lógico Programável (sala de controle)",
  "Programmable Logic Control (field)": "Controlador Lógico Programável (campo)",
  "Programmable Logic Control (inaccessible)": "Controlador Lógico Programável (inacessível)",
  "Programmable Logic Control (local panel)": "Controlador Lógico Programável (painel local)",
  "Prop Agitator": "Agitador de Hélice",
  "Proportional Feeder": "Alimentador Proporcional",
  "Proportional Feeder (Metering)": "Alimentador Proporcional (Dosador)",
  "Proportional Feeder (Rotary Valve)": "Alimentador Proporcional (Válvula Rotativa)",
  "Protective Palette Covering": "Cobertura Protetora de Paletes",
  "Pulsation Dampener": "Amortecedor de Pulsação",
  "Pump (Centrifugal)": "Bomba (Centrífuga)",
  "Pump (Diaphragm)": "Bomba (Diafragma)",
  "Pump (Gear)": "Bomba (Engrenagem)",
  "Pump (Liquid)": "Bomba (Líquido)",
  "Pump (Positive Displacement)": "Bomba (Deslocamento Positivo)",
  "Pump (Progressive Cavity)": "Bomba (Cavidade Progressiva)",
  "Pump (Reciprocating Piston)": "Bomba (Pistão Alternativo)",
  "Pump (Screw)": "Bomba (Rosca)",
  "Reactor": "Reator",
  "Reboiler": "Refervedor",
  "Reciprocating": "Alternativo",
  "Reciprocating Compressor": "Compressor Alternativo",
  "Reciprocating Compressor 2": "Compressor Alternativo 2",
  "Reducer": "Redução",
  "Relief PRV": "Válvula de Alívio (PRV)",
  "Removable Spool": "Carretel Removível",
  "Roller Conveyor": "Transportador de Rolos",
  "Rolling Bin": "Caçamba Basculante",
  "Rotameter": "Rotâmetro",
  "Rotary Compressor": "Compressor Rotativo",
  "Rotary Drum Drier, Tumbling Drier": "Secador de Tambor Rotativo, Secador de Tombamento",
  "Rotary Piston": "Pistão Rotativo",
  "Rotary Screen": "Peneira Rotativa",
  "Rotary Valve": "Válvula Rotativa",
  "Rupture Disc": "Disco de Ruptura",
  "Safety PSV 1": "Válvula de Segurança (PSV) 1",
  "Safety PSV 2": "Válvula de Segurança (PSV) 2",
  "Screening Device, Sieve, Strainer": "Dispositivo de Peneiramento, Peneira, Filtro",
  "Screening Device, Sieve, Strainer (Basket Reel)": "Dispositivo de Peneiramento, Peneira, Filtro (Tambor de Cesto)",
  "Screening Device, Sieve, Strainer (Coarse Rake)": "Dispositivo de Peneiramento, Peneira, Filtro (Grade Grossa)",
  "Screening Device, Sieve, Strainer (Coarse and Fine Screens)": "Dispositivo de Peneiramento, Peneira, Filtro (Telas Grossa e Fina)",
  "Screening Device, Sieve, Strainer (Fine Rake)": "Dispositivo de Peneiramento, Peneira, Filtro (Grade Fina)",
  "Screening Device, Sieve, Strainer (Rotating Drum)": "Dispositivo de Peneiramento, Peneira, Filtro (Tambor Rotativo)",
  "Screening Device, Sieve, Strainer (Vibrating)": "Dispositivo de Peneiramento, Peneira, Filtro (Vibratório)",
  "Screening Device, Sieve, Strainer (Vibrating)2": "Dispositivo de Peneiramento, Peneira, Filtro (Vibratório) 2",
  "Screw": "Rosca",
  "Screw Pump": "Bomba de Rosca",
  "Screw Pump 2": "Bomba de Rosca 2",
  "Self Draining Valve": "Válvula de Autodrenagem",
  "Self-Operating Release Valve": "Válvula de Alívio Auto-Operada",
  "Self-Operating Release Valve2": "Válvula de Alívio Auto-Operada 2",
  "Separator (Cyclone)": "Separador (Ciclone)",
  "Separator (Cyclone)2": "Separador (Ciclone) 2",
  "Separator (Electromagnetic)": "Separador (Eletromagnético)",
  "Separator (Electrostatic Precipitator)": "Separador (Precipitador Eletrostático)",
  "Separator (Electrostatic Precipitator, Wet)": "Separador (Precipitador Eletrostático, Úmido)",
  "Separator (Permanent Magnet)": "Separador (Ímã Permanente)",
  "Separator (Permanent Magnet)2": "Separador (Ímã Permanente) 2",
  "Separator (Venturi Scrubber)": "Separador (Lavador Venturi)",
  "Separator (Wet Scrubber)": "Separador (Lavador Úmido)",
  "Separator (Wet Scrubber)2": "Separador (Lavador Úmido) 2",
  "Separator, Sifter": "Separador, Peneirador",
  "Separator, Sifter2": "Separador, Peneirador 2",
  "Settling Tank": "Tanque de Decantação",
  "Shaping Machine (Horizontal)": "Máquina de Conformação (Horizontal)",
  "Shaping Machine (Vertical)": "Máquina de Conformação (Vertical)",
  "Shared Control/Display in DCS (control room)": "Controle Indicação Compartilhado no DCS (sala de controle)",
  "Shared Control/Display in DCS (field)": "Controle Indicação Compartilhado no DCS (campo)",
  "Shared Control/Display in DCS (inaccessible)": "Controle Indicação Compartilhado no DCS (inacessível)",
  "Shared Control/Display in DCS (local panel)": "Controle Indicação Compartilhado no DCS (painel local)",
  "Shell and Tube Heat Exchanger 1": "Trocador de Calor Casco e Tubo 1",
  "Shell and Tube Heat Exchanger 2": "Trocador de Calor Casco e Tubo 2",
  "Shell and Tube Heat Exchanger 3": "Trocador de Calor Casco e Tubo 3",
  "Ship": "Navio",
  "Silencer": "Silenciador",
  "Single Flange": "Flange Simples",
  "Single Pass Heat Exchanger": "Trocador de Calor de Passe Único",
  "Socket, Connection Nozzle": "Soquete, Bocal de Conexão",
  "Solenoid Valve Closed": "Válvula Solenoide Fechada",
  "Solidifier (Closed)": "Solidificador (Fechado)",
  "Solidifier (Open)": "Solidificador (Aberto)",
  "Spacer": "Espaçador",
  "Spiral Heat Exchanger": "Trocador de Calor Espiral",
  "Spray Cooler": "Resfriador por Aspersão",
  "Spray Drier": "Secador por Aspersão",
  "Spray Nozzle": "Bico Aspersor",
  "Spray Scrubber": "Lavador por Aspersão",
  "Spraying Device": "Dispositivo de Aspersão",
  "Stack, Chimney": "Chaminé",
  "Steam Trap": "Purgador de Vapor",
  "Steam Trap2": "Purgador de Vapor 2",
  "Storage Sphere": "Esfera de Armazenamento",
  "Strainer": "Filtro",
  "Strainer (Cone)": "Filtro (Cone)",
  "Submersible Pump": "Bomba Submersível",
  "Suction Filter": "Filtro de Sucção",
  "Sump Pump": "Bomba de Poço",
  "Support Bracket": "Suporte",
  "Support Leg": "Perna de Apoio",
  "Support Ring": "Anel de Suporte",
  "Support Skirt": "Saia de Suporte",
  "T-Type Strainer": "Filtro Tipo T",
  "Tank": "Tanque",
  "Tank (Boot)": "Tanque (Saia)",
  "Tank (Concrete Base)": "Tanque (Base de Concreto)",
  "Tank (Conical Bottom)": "Tanque (Fundo Cônico)",
  "Tank (Conical Roof and Bottom)": "Tanque (Teto e Fundo Cônicos)",
  "Tank (Conical Roof)": "Tanque (Teto Cônico)",
  "Tank (Covered)": "Tanque (Coberto)",
  "Tank (Covered, Boot)": "Tanque (Coberto, Saia)",
  "Tank (Dished Roof)": "Tanque (Teto Abaulhado)",
  "Tank (Dished Roof, Conical Bottom)": "Tanque (Teto Abaulhado, Fundo Cônico)",
  "Tank (False Bottom)": "Tanque (Fundo Falso)",
  "Tank (Floating Roof)": "Tanque (Teto Flutuante)",
  "Tank (Floating Roof, Boot)": "Tanque (Teto Flutuante, Saia)",
  "Tank Car, Tank Wagon": "Vagão Tanque",
  "Tank, Vessel": "Tanque, Vaso",
  "Target": "Alvo",
  "Temperature Element": "Elemento de Temperatura",
  "Temperature Indicator": "Indicador de Temperatura",
  "Temperature Recorder": "Registrador de Temperatura",
  "Temperature Transmitter": "Transmissor de Temperatura",
  "Temporary Strainer": "Filtro Temporário",
  "Thin-Film Evaporator": "Evaporador de Película Fina",
  "Three-Way Valve": "Válvula de Três Vias",
  "Tower": "Torre",
  "Tower With Packing": "Torre com Recheio",
  "Turbine": "Turbina",
  "Turbine Agitator": "Agitador de Turbina",
  "Turbo Drier, Disc Drier, Moving Shelf Drier": "Secador Turbo, Secador de Disco, Secador de Prateleiras Móveis",
  "U Shaped Tubes Heat Exchanger": "Trocador de Calor de Tubos em U",
  "U-Tube Heat Exchanger": "Trocador de Calor de Tubo em U",
  "Ultrasonic": "Ultrassônico",
  "V-cone": "Cone-V",
  "Vacuum Pump": "Bomba de Vácuo",
  "Vent": "Respiro",
  "Vent (Bent)": "Respiro (Curvo)",
  "Vent (Cover)": "Respiro (Cobertura)",
  "Vent Silencer": "Silenciador de Respiro",
  "Venturi": "Venturi",
  "Vertical Pump": "Bomba Vertical",
  "Vessel (Different Diameters)": "Vaso (Diâmetros Diferentes)",
  "Vessel (Dished Bottom, Surface Indication)": "Vaso (Fundo Abaulhado, Indicação de Superfície)",
  "Vessel (Dished Ends, Brackets)": "Vaso (Extremidades Abaulhadas, Suportes)",
  "Vessel (Dished Ends, Electrical Heating)": "Vaso (Extremidades Abaulhadas, Aquecimento Elétrico)",
  "Vessel (Dished Ends, Heating-Cooling Jacket)": "Vaso (Extremidades Abaulhadas, Camisa de Aquecimento-Resfriamento)",
  "Vessel (Dished Ends, Legs)": "Vaso (Extremidades Abaulhadas, Pernas)",
  "Vessel (Dished Ends, Ring)": "Vaso (Extremidades Abaulhadas, Anel)",
  "Vessel (Dished Ends, Skirts)": "Vaso (Extremidades Abaulhadas, Saias)",
  "Vessel (Dished Ends, Thermal Insulation)": "Vaso (Extremidades Abaulhadas, Isolamento Térmico)",
  "Vessel (Dome)": "Vaso (Domo)",
  "Vessel (Full-Tube Heating-Cooling Coil)": "Vaso (Serpentina de Aquecimento-Resfriamento de Tubo Completo)",
  "Vessel (Pit)": "Vaso (Poço)",
  "Vessel (Semi-Tube Heating-Cooling Coil)": "Vaso (Serpentina de Aquecimento-Resfriamento de Meio-Tubo)",
  "Viewing Glass": "Visor de Vidro",
  "Viewing Glass (Lighting)": "Visor de Vidro (Iluminação)",
  "Vortex": "Vórtice",
  "Wedge": "Cunha",
  "Weir": "Vertedor",
  "Welded Connection": "Conexão Soldada",
  "Welded Connection2": "Conexão Soldada 2",
  "Y-Type Strainer": "Filtro Tipo Y"
}
```

- [ ] **Step 2: Validate JSON is well-formed**

Run: `python3 -m json.tool scripts/catalog_translations.json > /dev/null`
Expected: Exit code 0, no output.

- [ ] **Step 3: Verify all 526 names are covered**

Run: `python3 -c "
import json
from pathlib import Path
names = set()
base = Path('frontend/src/features/pid/catalog/generated')
for f in ['drawio-catalog.json', 'drawio-pid2-catalog.json']:
    data = json.loads((base / f).read_text())
    for item in data:
        names.add(item['name'])
with open('scripts/catalog_translations.json') as fh:
    translations = json.load(fh)
missing = names - set(translations.keys())
extra = set(translations.keys()) - names
print(f'Total catalog names: {len(names)}')
print(f'Translations dict keys: {len(translations)}')
if missing:
    print(f'MISSING: {sorted(missing)}')
if extra:
    print(f'EXTRA: {sorted(extra)}')
if not missing and not extra:
    print('OK: All names covered, no extras')
"`

Expected: `OK: All names covered, no extras`

- [ ] **Step 4: Commit**

```bash
git add -f scripts/catalog_translations.json
git commit -m "feat: add pt-BR translation dictionary for P&ID catalog names"
```

---

### Task 2: Create the translation script

**Files:**
- Create: `scripts/translate_catalog.py`

- [ ] **Step 1: Write the translation script**

```python
#!/usr/bin/env python3
"""Apply pt-BR name translations to P&ID catalog JSON files."""

import json
import sys
import warnings
from pathlib import Path

TRANSLATIONS_PATH = Path(__file__).resolve().parent / "catalog_translations.json"
CATALOG_FILES = [
    "frontend/src/features/pid/catalog/generated/drawio-catalog.json",
    "frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json",
]

ENGLISH_PATTERNS = [" and ", " or ", " with "]


def main():
    repo_root = Path(__file__).resolve().parent.parent
    translations = load_translations()

    for rel_path in CATALOG_FILES:
        catalog_path = repo_root / rel_path
        print(f"Processing {rel_path}...")

        data = read_json(catalog_path)
        original_count = len(data)
        updated = apply_translations(data, translations)
        write_json(catalog_path, data)

        validate_output(catalog_path, original_count)
        print(f"  {updated} names translated (out of {original_count} symbols)")

    print("Done.")


def load_translations():
    if not TRANSLATIONS_PATH.exists():
        sys.exit(f"Error: Translation file not found at {TRANSLATIONS_PATH}")
    with open(TRANSLATIONS_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def read_json(path):
    if not path.exists():
        sys.exit(f"Error: Catalog file not found at {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def apply_translations(items, translations):
    updated = 0
    for item in items:
        key = item["name"]
        if key in translations:
            item["name"] = translations[key]
            updated += 1
        else:
            warnings.warn(f"Missing translation for name: {key!r}")
    return updated


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def validate_output(path, expected_count):
    data = read_json(path)

    if len(data) != expected_count:
        sys.exit(
            f"Error: Symbol count mismatch in {path}: "
            f"expected {expected_count}, got {len(data)}"
        )

    for item in data:
        name = item["name"]
        for pattern in ENGLISH_PATTERNS:
            if pattern in name:
                warnings.warn(
                    f"Name may still be in English ({pattern!r} found): {name!r}"
                )
                break


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Make the script executable**

Run: `chmod +x scripts/translate_catalog.py`

- [ ] **Step 3: Dry-run validation — verify script finds all translations before applying**

Run: `python3 -c "
import json
from pathlib import Path
translations = json.loads(Path('scripts/catalog_translations.json').read_text())
for f in ['frontend/src/features/pid/catalog/generated/drawio-catalog.json', 'frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json']:
    data = json.loads(Path(f).read_text())
    missing = [item['name'] for item in data if item['name'] not in translations]
    if missing:
        print(f'{f}: MISSING {len(missing)} translations:')
        for m in missing:
            print(f'  - {m}')
    else:
        print(f'{f}: All {len(data)} names have translations')
"`

Expected: Both files report all names have translations, no missing.

- [ ] **Step 4: Commit**

```bash
git add scripts/translate_catalog.py
git commit -m "feat: add catalog translation script"
```

---

### Task 3: Run the translation and validate

- [ ] **Step 1: Back up the original catalog files**

```bash
cp frontend/src/features/pid/catalog/generated/drawio-catalog.json frontend/src/features/pid/catalog/generated/drawio-catalog.json.bak
cp frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json.bak
```

- [ ] **Step 2: Run the translation script**

Run: `python3 scripts/translate_catalog.py`
Expected: No errors or warnings. Output shows both files processed with all names translated.

- [ ] **Step 3: Verify translated files are valid JSON and complete**

Run: `python3 -c "
import json
for f in ['drawio-catalog.json', 'drawio-pid2-catalog.json']:
    path = f'frontend/src/features/pid/catalog/generated/{f}'
    with open(path) as fh:
        data = json.load(fh)
    names = [item['name'] for item in data]
    keys = [item['key'] for item in data]
    print(f'{f}: {len(data)} symbols, keys unique={len(keys)==len(set(keys))}')
    # Print sample translations
    for item in data[:3]:
        print(f'  {item[\"name\"]} (aliases: {item[\"aliases\"][:2]})')
    print()
"`

Expected: 478 and 69 symbols, all keys unique, names printed in pt-BR with English aliases preserved.

- [ ] **Step 4: Verify no English-looking names remain**

Run: `python3 -c "
import json
import re
english_words = [' and ', ' or ', ' with ', ' of ', ' the ']
for f in ['drawio-catalog.json', 'drawio-pid2-catalog.json']:
    path = f'frontend/src/features/pid/catalog/generated/{f}'
    with open(path) as fh:
        data = json.load(fh)
    suspicious = []
    for item in data:
        for word in english_words:
            if word in item['name'].lower():
                suspicious.append(item['name'])
                break
    if suspicious:
        print(f'{f}: WARNING - possible English names:')
        for n in suspicious:
            print(f'  - {n}')
    else:
        print(f'{f}: OK - no English patterns detected in names')
"`

Expected: Both files OK or a small number of expected false positives (proper nouns like "Venturi", "Coriolis", "HEPA", "DCS").

- [ ] **Step 5: Verify TypeScript build still passes**

Run: `npm run typecheck 2>&1 | tail -5 || npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 6: Remove backup files**

```bash
rm frontend/src/features/pid/catalog/generated/drawio-catalog.json.bak
rm frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json.bak
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/pid/catalog/generated/drawio-catalog.json frontend/src/features/pid/catalog/generated/drawio-pid2-catalog.json
git commit -m "feat: translate P&ID catalog names to pt-BR

Apply translations via scripts/translate_catalog.py to all 547 symbols
across drawio-catalog.json (478) and drawio-pid2-catalog.json (69).
English originals preserved in aliases for backward-compatible search."
```
