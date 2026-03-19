import pprint

def print_header(title):
    print(f"\n{'='*20} {title} {'='*20}")

def print_result(func_name, result):
    print(f"\n--- {func_name} ---")
    if isinstance(result, (dict, list)):
        pprint.pprint(result, indent=2, width=80, compact=True)
    else:
        print(result)
