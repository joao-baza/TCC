import base64
from io import BytesIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from models import MassBalance
from schemas import MassBalanceRequest

router = APIRouter(prefix="/mass-balance", tags=["Mass Balance"])


@router.post("/calculate")
def calculate_mass_balance(payload: MassBalanceRequest):
    try:
        # Validate stream compositions before creating the mass balance model
        for stream in payload.streams:
            is_valid, error_message = MassBalance.validate_stream_compositions(stream)
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
        # Create mass balance model
        mb = MassBalance(payload.components)
        
        # Add streams
        for stream in payload.streams:
            mb.add_stream(
                stream.name, 
                payload.components, 
                stream.direction, 
                stream.flow_rate, 
                stream.compositions
            )
        
        # Add reactions
        if payload.reactions:
            for reaction in payload.reactions:
                mb.add_reaction(
                    reaction.stoichiometry,
                    reaction.key_component,
                    reaction.conversion
                )
        
        # Add splits
        if payload.splits:
            for split in payload.splits:
                mb.add_split(
                    split.parent_stream,
                    split.recycle_stream,
                    split.purge_stream,
                    split.fraction
                )
        
        try:
            # Solve the system
            results = mb.get_results()
            
            # Validate results - make sure validation runs
            is_valid, error_message = mb.validate_results(results)
            
            # Extra safety check for negative values - check again explicitly
            for stream_name, stream_data in results.items():
                if stream_data["flow_rate"] < 0:
                    raise ValueError(f"Negative flow rate detected for stream '{stream_name}': {stream_data['flow_rate']}")
                
                for component, fraction in stream_data["compositions"].items():
                    if fraction < 0:
                        raise ValueError(f"Negative composition detected for component '{component}' in stream '{stream_name}': {fraction}")
                
                sum_fractions = sum(stream_data["compositions"].values())
                if not (0.99 <= sum_fractions <= 1.01):
                    raise ValueError(f"Component fractions in stream '{stream_name}' do not sum to approximately 1: {sum_fractions}")
            
            # Fail fast if validation failed
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
            # Calculate process metrics if possible
            metrics = {}
            
            # Try to calculate common metrics if we have typical stream names
            try:
                feed_streams = [s for s in payload.streams if "feed" in s.name.lower() and s.direction == 1]
                product_streams = [s for s in payload.streams if "product" in s.name.lower() and s.direction == -1]
                recycle_streams = [s for s in payload.streams if "recycle" in s.name.lower() and s.direction == 1]
                
                if feed_streams and product_streams:
                    feed_stream = feed_streams[0].name
                    product_stream = product_streams[0].name
                    
                    fresh_feed = results[feed_stream]["flow_rate"]
                    product_flow = results[product_stream]["flow_rate"]
                    
                    metrics["fresh_feed"] = fresh_feed
                    metrics["product_flow"] = product_flow
                    
                    if recycle_streams:
                        recycle_stream = recycle_streams[0].name
                        recycle_ratio = results[recycle_stream]["flow_rate"] / fresh_feed
                        metrics["recycle_ratio"] = recycle_ratio
            except Exception as e:
                # If we can't calculate metrics, just continue without them
                pass
                
            return {
                "results": results,
                "metrics": metrics
            }
        except ValueError as validation_error:
            # Catch and properly raise validation errors
            return JSONResponse(
                status_code=400,
                content={"detail": str(validation_error)}
            )
            
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/plot")
def plot_mass_balance(payload: MassBalanceRequest):
    try:
        # Validate stream compositions before creating the mass balance model
        for stream in payload.streams:
            is_valid, error_message = MassBalance.validate_stream_compositions(stream)
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
        # Create mass balance model
        mb = MassBalance(payload.components)
        
        # Add streams
        for stream in payload.streams:
            mb.add_stream(
                stream.name, 
                payload.components, 
                stream.direction, 
                stream.flow_rate, 
                stream.compositions
            )
        
        # Add reactions
        if payload.reactions:
            for reaction in payload.reactions:
                mb.add_reaction(
                    reaction.stoichiometry,
                    reaction.key_component,
                    reaction.conversion
                )
        
        # Add splits
        if payload.splits:
            for split in payload.splits:
                mb.add_split(
                    split.parent_stream,
                    split.recycle_stream,
                    split.purge_stream,
                    split.fraction
                )
        
        try:
            # Solve the system
            results = mb.get_results()
            
            # Validate results - make sure validation runs
            is_valid, error_message = mb.validate_results(results)
            
            # Extra safety check for negative values - check again explicitly
            for stream_name, stream_data in results.items():
                if stream_data["flow_rate"] < 0:
                    raise ValueError(f"Negative flow rate detected for stream '{stream_name}': {stream_data['flow_rate']}")
                
                for component, fraction in stream_data["compositions"].items():
                    if fraction < 0:
                        raise ValueError(f"Negative composition detected for component '{component}' in stream '{stream_name}': {fraction}")
                
                sum_fractions = sum(stream_data["compositions"].values())
                if not (0.99 <= sum_fractions <= 1.01):
                    raise ValueError(f"Component fractions in stream '{stream_name}' do not sum to approximately 1: {sum_fractions}")
            
            # Fail fast if validation failed
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
            # Create a figure with subplots
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
            
            # Get stream names and flow rates
            streams = list(results.keys())
            flow_rates = [results[s]["flow_rate"] for s in streams]
            
            # Plot flow rates
            ax1.bar(streams, flow_rates, color='skyblue')
            ax1.set_title('Stream Flow Rates')
            ax1.set_ylabel('Flow Rate (mass or mol/time)')
            ax1.tick_params(axis='x', rotation=45)
            
            # Plot compositions for each stream
            components = payload.components
            colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
            
            x = np.arange(len(streams))
            width = 0.2
            offsets = np.linspace(-0.3, 0.3, len(components))
            
            for i, comp in enumerate(components):
                comp_values = [results[s]["compositions"][comp] for s in streams]
                ax2.bar(x + offsets[i], comp_values, width, label=comp, color=colors[i % len(colors)])
            
            ax2.set_title('Stream Compositions')
            ax2.set_xticks(x)
            ax2.set_xticklabels(streams, rotation=45)
            ax2.set_ylabel('Mass or Molar Fraction')
            ax2.set_ylim(0, 1)
            ax2.legend()
            
            plt.tight_layout()
            
            # Add a text annotation explaining units
            fig.text(0.5, 0.01, 
                    'Note: Flow rates can be in any mass or molar units (consistent throughout).\n'
                    'Compositions are mass fractions when using mass flow units or molar fractions when using molar flow units.',
                    ha='center', fontsize=8, style='italic')
            
            # Save the figure to a BytesIO object and encode as base64
            buffer = BytesIO()
            fig.savefig(buffer, format='png')
            buffer.seek(0)
            
            # Encode the image to base64
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            plt.close(fig)  # Close figure to free memory
            
            return {"image_base64": image_base64}
        except ValueError as validation_error:
            # Catch and properly raise validation errors
            return JSONResponse(
                status_code=400,
                content={"detail": str(validation_error)}
            )
            
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/example")
def get_mass_balance_example():
    """
    Returns an example mass balance configuration based on example_mass_balance.py
    This can be used as a template for the /mass-balance/calculate and /mass-balance/plot endpoints
    """
    # Example from example_mass_balance.py
    example = {
        "components": ["A", "B", "C", "D"],
        "streams": [
            {
                "name": "Fresh_Feed",
                "direction": 1,  # +1 for input
                "flow_rate": 100,
                "compositions": {"A": 0.8, "B": 0.2, "C": 0, "D": 0}
            },
            {
                "name": "Reactor_Out",
                "direction": -1,  # -1 for output
                "flow_rate": None,
                "compositions": {"A": None, "B": None, "C": None, "D": None}
            },
            {
                "name": "Recycle",
                "direction": 1,  # +1 for input
                "flow_rate": None,
                "compositions": {"A": None, "B": None, "C": None, "D": None}
            },
            {
                "name": "Product",
                "direction": -1,  # -1 for output
                "flow_rate": None,
                "compositions": {"A": None, "B": None, "C": None, "D": None}
            }
        ],
        "reactions": [
            {
                "stoichiometry": {"A": -1, "C": 1},
                "key_component": "A",
                "conversion": 0.7
            },
            {
                "stoichiometry": {"B": -1, "D": 1},
                "key_component": "B",
                "conversion": 0.85
            }
        ],
        "splits": [
            {
                "parent_stream": "Reactor_Out",
                "recycle_stream": "Recycle",
                "purge_stream": "Product",
                "fraction": 0.6
            }
        ]
    }
    
    return example


@router.post("/yields")
def calculate_yields(payload: MassBalanceRequest):
    """
    Calculate yield metrics based on mass balance results
    """
    try:
        # Validate stream compositions before creating the mass balance model
        for stream in payload.streams:
            is_valid, error_message = MassBalance.validate_stream_compositions(stream)
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
        # First get the mass balance results
        mb = MassBalance(payload.components)
        
        # Add streams
        for stream in payload.streams:
            mb.add_stream(
                stream.name, 
                payload.components, 
                stream.direction, 
                stream.flow_rate, 
                stream.compositions
            )
        
        # Add reactions
        if payload.reactions:
            for reaction in payload.reactions:
                mb.add_reaction(
                    reaction.stoichiometry,
                    reaction.key_component,
                    reaction.conversion
                )
        
        # Add splits
        if payload.splits:
            for split in payload.splits:
                mb.add_split(
                    split.parent_stream,
                    split.recycle_stream,
                    split.purge_stream,
                    split.fraction
                )
        
        try:
            # Solve the system
            results = mb.get_results()
            
            # Validate results - make sure validation runs
            is_valid, error_message = mb.validate_results(results)
            
            # Extra safety check for negative values - check again explicitly
            for stream_name, stream_data in results.items():
                if stream_data["flow_rate"] < 0:
                    raise ValueError(f"Negative flow rate detected for stream '{stream_name}': {stream_data['flow_rate']}")
                
                for component, fraction in stream_data["compositions"].items():
                    if fraction < 0:
                        raise ValueError(f"Negative composition detected for component '{component}' in stream '{stream_name}': {fraction}")
                
                sum_fractions = sum(stream_data["compositions"].values())
                if not (0.99 <= sum_fractions <= 1.01):
                    raise ValueError(f"Component fractions in stream '{stream_name}' do not sum to approximately 1: {sum_fractions}")
            
            # Fail fast if validation failed
            if not is_valid:
                raise HTTPException(status_code=400, detail=str(error_message))
            
            # Identify feed and product streams
            feed_streams = [s for s in payload.streams if s.direction == 1]
            product_streams = [s for s in payload.streams if s.direction == -1]
            
            # Calculate yields between components
            yields = {}
            
            # For each component pair, calculate yield
            for comp_out in payload.components:
                for comp_in in payload.components:
                    if comp_in != comp_out:  # Only calculate yield between different components
                        # Calculate total input of comp_in
                        comp_in_total = sum(
                            results[s.name]["flow_rate"] * results[s.name]["compositions"][comp_in]
                            for s in feed_streams if s.flow_rate is not None
                        )
                        
                        # Calculate total output of comp_out
                        comp_out_total = sum(
                            -results[s.name]["flow_rate"] * results[s.name]["compositions"][comp_out]
                            for s in product_streams
                        )
                        
                        # Calculate yield if input is not zero
                        if comp_in_total > 0:
                            yields[f"{comp_out}_from_{comp_in}"] = (comp_out_total / comp_in_total) * 100
            
            return {
                "yields": yields,
                "results": results
            }
        except ValueError as validation_error:
            # Catch and properly raise validation errors
            return JSONResponse(
                status_code=400,
                content={"detail": str(validation_error)}
            )
            
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

