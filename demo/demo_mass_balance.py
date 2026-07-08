import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.mass_balance import MassBalance
from demo.utils import print_header, print_result


def demo_mixer():
    print_header("1. Validação Misturador")
    # Caso: Mistura de Água (S1) e Etanol (S2)
    mb = MassBalance(components=["Agua", "Etanol"])
    mb.add_stream("S1", ["Agua", "Etanol"], 1, flow_rate=100.0, compositions={"Agua": 1.0, "Etanol": 0.0})
    mb.add_stream("S2", ["Agua", "Etanol"], 1, flow_rate=100.0, compositions={"Agua": 0.0, "Etanol": 1.0})
    mb.add_stream("S3", ["Agua", "Etanol"], -1)
    
    results = mb.get_results()
    s3 = results["S3"]
    print(f"S1 (In): 100 kg/h [Agua: 1.0]")
    print(f"S2 (In): 100 kg/h [Etanol: 1.0]")
    print(f"S3 (Out): Flow={s3['flow_rate']:.2f} kg/h, Comp={s3['compositions']}")

def demo_reactor():
    print_header("2. Validação Reator de Conversão")
    # Caso: Reação A -> B com 40% de conversão
    # Alimentação: 100 mol/s de A puro
    mb = MassBalance(components=["A", "B"])
    mb.add_stream("Feed", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 1.0, "B": 0.0})
    mb.add_stream("Product", ["A", "B"], -1)
    
    # Reação: A -> B (Estequiometria: -1 A, +1 B)
    # Conversão de A = 0.40
    mb.add_reaction({"A": -1, "B": 1}, key_component="A", conversion=0.40)
    
    results = mb.get_results()
    prod = results["Product"]
    print(f"Feed (In): 100 mol/s [A: 1.0]")
    print(f"Reaction: A -> B (X=40%)")
    print(f"Product (Out): Flow={prod['flow_rate']:.2f} mol/s, Comp={prod['compositions']}")

def demo_recycle():
    print_header("3. Validação Reciclo com Purga")
    
    mb = MassBalance(components=["A"])
    mb.add_stream("Feed", ["A"], 1, flow_rate=100.0, compositions={"A": 1.0})

    mb_split = MassBalance(components=["A", "B"])
    mb_split.add_stream("S_Main", ["A", "B"], 1, flow_rate=100.0, compositions={"A": 0.5, "B": 0.5})
    mb_split.add_stream("S_Recycle", ["A", "B"], -1)
    mb_split.add_stream("S_Product", ["A", "B"], -1)
    
    # Split: 20% Reciclo, 80% Produto
    mb_split.add_split("S_Main", "S_Recycle", "S_Product", fraction=0.2)
    
    res = mb_split.get_results()
    rec = res["S_Recycle"]
    prod = res["S_Product"]
    
    print(f"Main (In): 100 kg/h [A:0.5, B:0.5]")
    print(f"Split Fraction: 0.2 (20% Reciclo)")
    print(f"Recycle (Out): Flow={rec['flow_rate']:.2f}, Comp={rec['compositions']}")
    print(f"Product (Out): Flow={prod['flow_rate']:.2f}, Comp={prod['compositions']}")


def demo_router_example():
    print_header("4. Exemplo Completo Reacao e Reciclo")

    mb = MassBalance(components=["A", "B", "C", "D"])
    mb.add_stream(
        "Alimentacao_Fresca",
        ["A", "B", "C", "D"],
        1,
        flow_rate=100.0,
        compositions={"A": 0.8, "B": 0.2, "C": 0.0, "D": 0.0},
    )
    mb.add_stream(
        "Saida_Do_Reator",
        ["A", "B", "C", "D"],
        -1,
    )
    mb.add_stream(
        "Reciclo",
        ["A", "B", "C", "D"],
        1,
    )
    mb.add_stream(
        "Produto",
        ["A", "B", "C", "D"],
        -1,
    )
    mb.add_reaction({"A": -1, "C": 1}, key_component="A", conversion=0.7)
    mb.add_reaction({"B": -1, "D": 1}, key_component="B", conversion=0.85)
    mb.add_split("Saida_Do_Reator", "Reciclo", "Produto", fraction=0.6)

    results = mb.get_results()
    print_result("router_example.results", results)


if __name__ == "__main__":
    demo_mixer()
    print("-" * 30)
    demo_reactor()
    print("-" * 30)
    demo_recycle()
    print("-" * 30)
    demo_router_example()
