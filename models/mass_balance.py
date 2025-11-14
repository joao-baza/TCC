import matplotlib
matplotlib.use('Agg')  # Set non-interactive backend before importing pyplot
import matplotlib.pyplot as plt
import sympy as sp
from collections import OrderedDict

# ----------------------------------------------------------------------
# 1) Streams ----------------------------------------------------------
class Stream:
    def __init__(self, name, components, direction, flow_rate=None, compositions=None):
        """
        Initialize a stream
        
        Parameters:
        -----------
        name : str
            Name of the stream
        components : list
            List of component names
        direction : int
            +1 for input, -1 for output
        flow_rate : float, optional
            Flow rate of the stream in any consistent mass units (kg/h, g/min, etc.) 
            or molar units (mol/s, kmol/h, etc.). If None, it will be treated as symbolic.
        compositions : dict, optional
            Dictionary of component compositions (mass fractions when using mass flow units,
            molar fractions when using molar flow units). If None, they will be treated as symbolic.
        """
        self.name = name
        self.dir = direction  # +1 input; −1 output
        self.F = sp.symbols(f"F_{name}") if flow_rate is None else float(flow_rate)

        self.z = OrderedDict()
        for c in components:
            if compositions and c in compositions and compositions[c] is not None:
                self.z[c] = float(compositions[c])
            else:
                self.z[c] = sp.symbols(f"z_{name}_{c}")

# ----------------------------------------------------------------------
# 2) Reactions ---------------------------------------------------------
class Reaction:
    _count = 0
    def __init__(self, stoichiometry, key_component, conversion):
        """
        Initialize a reaction
        
        Parameters:
        -----------
        stoichiometry : dict
            Dictionary of {component: stoichiometric_coefficient}
        key_component : str
            Key component for conversion calculation
        conversion : float
            Conversion of the key component (0-1)
        """
        Reaction._count += 1
        self.id = Reaction._count
        self.nu = stoichiometry  # {comp: ν_i}
        self.key = key_component
        self.X = float(conversion)
        self.eps = sp.symbols(f"eps_{self.id}")  # reaction extent

# ----------------------------------------------------------------------
# 3) Splitters (Recycle) ----------------------------------------------
class Split:
    _count = 0
    def __init__(self, parent_stream, recycle_stream, purge_stream, fraction=None):
        """
        Initialize a splitter
        
        Parameters:
        -----------
        parent_stream : str
            Name of the parent stream
        recycle_stream : str
            Name of the recycle stream
        purge_stream : str
            Name of the purge stream
        fraction : float, optional
            Recycle fraction (0-1) - symbolic if None
        """
        Split._count += 1
        self.id = Split._count
        self.pai = parent_stream
        self.rec = recycle_stream
        self.purge = purge_stream
        # Recycle fraction f (0-1) - symbolic if not provided
        self.f = float(fraction) if fraction is not None else sp.symbols(f"f_{self.id}")

# ----------------------------------------------------------------------
# 4) Mass Balance Model ------------------------------------------------
class MassBalance:
    def __init__(self, components):
        """
        Initialize a mass balance model
        
        Parameters:
        -----------
        components : list
            List of component names
        """
        self.comps = list(components)
        self.streams = {}
        self.reactions = []
        self.splits = []

    # ---------- helpers ---------------------------------------------------
    def _get_stream(self, name):  # shortcut to get stream by name
        return self.streams[name]

    # ---------- API for model building ------------------------------------
    def add_stream(self, name, components, direction, flow_rate=None, compositions=None):
        """
        Add a stream to the model
        
        Parameters:
        -----------
        name : str
            Name of the stream
        components : list
            List of component names
        direction : int
            +1 for input, -1 for output
        flow_rate : float, optional
            Flow rate of the stream in any consistent mass units (kg/h, g/min, etc.) 
            or molar units (mol/s, kmol/h, etc.). If None, it will be treated as symbolic.
        compositions : dict, optional
            Dictionary of component compositions (mass fractions when using mass flow units,
            molar fractions when using molar flow units). If None, they will be treated as symbolic.
        """
        s = Stream(name, components, direction, flow_rate, compositions)
        self.streams[s.name] = s

    def add_reaction(self, stoichiometry, key_component, conversion=None, X=None, conversao=None):
        """
        Add a reaction to the model
        
        Parameters:
        -----------
        stoichiometry : dict
            Dictionary of {component: stoichiometric_coefficient}
        key_component : str
            Key component for conversion calculation
        conversion : float, optional
            Conversion of the key component (0-1)
        X : float, optional
            Alternative name for conversion (for compatibility)
        conversao : float, optional
            Portuguese name for conversion (for compatibility with MB-2.py)
        """
        # For compatibility with different parameter names
        if conversion is not None:
            actual_conversion = conversion
        elif X is not None:
            actual_conversion = X
        elif conversao is not None:
            actual_conversion = conversao
        else:
            raise ValueError("Either 'conversion', 'X', or 'conversao' must be provided")
        
        self.reactions.append(Reaction(stoichiometry, key_component, actual_conversion))

    def add_split(self, parent_stream, recycle_stream, purge_stream, fraction=None):
        """
        Add a split (recycle) to the model
        
        Parameters:
        -----------
        parent_stream : str
            Name of the parent stream
        recycle_stream : str
            Name of the recycle stream
        purge_stream : str
            Name of the purge stream
        fraction : float, optional
            Recycle fraction (0-1) - symbolic if None
        """
        self.splits.append(Split(parent_stream, recycle_stream, purge_stream, fraction))

    # ---------- Equations --------------------------------------------------
    def build_equations(self):
        """Build the system of equations for the mass balance model"""
        eqs = []

        # (a) overall balance (inputs = external outputs)
        IN = sum(s.dir * s.F for s in self.streams.values() if s.dir == +1)
        OUT = sum(-s.dir * s.F for s in self.streams.values() if s.dir == -1)
        eqs.append(sp.Eq(IN, OUT))

        # (b) component balances
        for comp in self.comps:
            acc_in = sum(s.dir * s.F * s.z[comp] for s in self.streams.values() if s.dir == +1)
            acc_out = sum(-s.dir * s.F * s.z[comp] for s in self.streams.values() if s.dir == -1)
            gen = sum(r.nu.get(comp, 0) * r.eps for r in self.reactions)
            eqs.append(sp.Eq(acc_in + gen, acc_out))

        # (c) composition normalization for each stream
        for s in self.streams.values():
            eqs.append(sp.Eq(sum(s.z.values()), 1))

        # (d) conversions → extents
        for r in self.reactions:
            m_in_key = sum(s.dir * s.F * s.z[r.key] for s in self.streams.values()
                          if s.dir == +1)  # mass of key reactant entering
            eqs.append(sp.Eq(r.eps, r.X * m_in_key))

        # (e) splits (recycle)
        for s in self.splits:
            p, r, g = self._get_stream(s.pai), self._get_stream(s.rec), self._get_stream(s.purge)
            # flow rates
            eqs += [sp.Eq(r.F, s.f * p.F),
                    sp.Eq(g.F, (1 - s.f) * p.F)]
            # compositions are equal
            for comp in self.comps:
                eqs += [sp.Eq(r.z[comp], p.z[comp]),
                        sp.Eq(g.z[comp], p.z[comp])]

        return eqs

    # ---------- solution ---------------------------------------------------
    def solve(self):
        """Solve the mass balance equations"""
        eqs = self.build_equations()
        symbols = set().union(*(e.free_symbols for e in eqs))
        sol = sp.solve(eqs, list(symbols), dict=True)
        if not sol:
            raise ValueError("System is underdetermined or has no solution.")
        return sol[0]

    def get_results(self, solution=None):
        """
        Get formatted results from the solution
        
        Parameters:
        -----------
        solution : dict, optional
            Solution dictionary from solve() (if None, solve() is called)
            
        Returns:
        --------
        dict
            Dictionary with stream flow rates (in the same units as input) 
            and compositions (mass or molar fractions depending on flow rate units)
        """
        if solution is None:
            solution = self.solve()
            
        results = {}
        for stream_name, stream in self.streams.items():
            stream_results = {
                'flow_rate': float(solution.get(stream.F, stream.F)),
                'compositions': {}
            }
            
            for comp, z in stream.z.items():
                stream_results['compositions'][comp] = float(solution.get(z, z))
                
            results[stream_name] = stream_results
            
        return results 
        
    def validate_results(self, results=None):
        """
        Validate mass balance results to ensure:
        1. Component fractions sum close to 1 for each stream
        2. No negative flow rates
        3. No negative component fractions
        
        Parameters:
        -----------
        results : dict, optional
            Results dictionary from get_results() (if None, get_results() is called)
            
        Returns:
        --------
        tuple
            (is_valid, error_message)
        """
        if results is None:
            results = self.get_results()
            
        # Check for negative flow rates
        for stream_name, stream_data in results.items():
            if stream_data["flow_rate"] < 0:
                return False, f"Negative flow rate detected for stream '{stream_name}': {stream_data['flow_rate']}"
        
        # Check for negative component fractions and sum close to 1
        for stream_name, stream_data in results.items():
            compositions = stream_data["compositions"]
            
            # Check for negative component fractions
            for component, fraction in compositions.items():
                if fraction < 0:
                    return False, f"Negative composition detected for component '{component}' in stream '{stream_name}': {fraction}"
            
            # Check if component fractions sum close to 1
            sum_fractions = sum(compositions.values())
            if not (0.99 <= sum_fractions <= 1.01):
                return False, f"Component fractions in stream '{stream_name}' do not sum to approximately 1: {sum_fractions}"
        
        return True, ""
        
    @staticmethod
    def validate_stream_compositions(stream):
        """
        Validate stream compositions to ensure the sum of non-null composition fractions is approximately 1.
        
        Parameters:
        -----------
        stream : object
            Stream object with name and compositions attributes
            
        Returns:
        --------
        tuple
            (is_valid, error_message)
        """
        # Only validate compositions if at least one is not null
        non_null_values = [fraction for fraction in stream.compositions.values() if fraction is not None]
        if non_null_values:  # Check if there are any non-null values
            sum_fractions = sum(non_null_values)
            if sum_fractions > 1.01 or sum_fractions < 0.99:  # Allow a small tolerance for floating point errors
                return False, f"Component fractions in stream '{stream.name}' sum to {sum_fractions}, which differs from 1"
        
        return True, "" 