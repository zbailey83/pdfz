"""
Budget optimization service using constrained optimization.
"""
import numpy as np
from scipy.optimize import minimize
from typing import Dict, List, Optional, Tuple, Any, Callable
import logging

logger = logging.getLogger(__name__)


class BudgetOptimizer:
    """Optimize marketing budget allocation across channels."""

    def __init__(
        self,
        marginal_roas: Dict[str, float],
        saturation_curves: Optional[Dict[str, Callable]] = None,
    ):
        """
        Initialize optimizer.

        Args:
            marginal_roas: Dictionary of channel -> marginal ROAS
            saturation_curves: Optional saturation functions per channel
        """
        self.marginal_roas = marginal_roas
        self.channels = list(marginal_roas.keys())
        self.saturation_curves = saturation_curves or {}

    def _revenue_function(
        self, allocations: np.ndarray, use_saturation: bool = True
    ) -> float:
        """
        Calculate total expected revenue for given allocations.

        Args:
            allocations: Array of spend allocations per channel
            use_saturation: Whether to apply saturation curves

        Returns:
            Negative revenue (for minimization)
        """
        total_revenue = 0.0

        for i, channel in enumerate(self.channels):
            spend = allocations[i]
            base_roas = self.marginal_roas[channel]

            if use_saturation and channel in self.saturation_curves:
                # Apply saturation curve
                effective_roas = self.saturation_curves[channel](spend)
            else:
                # Linear assumption (diminishing returns approximation)
                # Simple saturation: ROAS decreases as spend increases
                saturation_factor = 1.0 / (1.0 + spend / 1000.0)
                effective_roas = base_roas * saturation_factor

            total_revenue += spend * effective_roas

        # Return negative for minimization
        return -total_revenue

    def optimize(
        self,
        total_budget: float,
        min_spend: Optional[Dict[str, float]] = None,
        max_spend: Optional[Dict[str, float]] = None,
        constraints: Optional[List[Dict]] = None,
    ) -> Dict:
        """
        Optimize budget allocation.

        Args:
            total_budget: Total budget to allocate
            min_spend: Minimum spend per channel
            max_spend: Maximum spend per channel
            constraints: Additional constraints

        Returns:
            Optimization results
        """
        n_channels = len(self.channels)

        # Initial guess: equal allocation
        x0 = np.array([total_budget / n_channels] * n_channels)

        # Bounds: [0, total_budget] per channel (or custom)
        bounds = []
        for channel in self.channels:
            min_val = min_spend.get(channel, 0.0) if min_spend else 0.0
            max_val = (
                max_spend.get(channel, total_budget)
                if max_spend
                else total_budget
            )
            bounds.append((min_val, max_val))

        # Constraints
        constraint_list = []

        # Budget constraint: sum of allocations = total_budget
        constraint_list.append(
            {
                "type": "eq",
                "fun": lambda x: np.sum(x) - total_budget,
            }
        )

        # Add custom constraints
        if constraints:
            constraint_list.extend(constraints)

        # Optimize
        result = minimize(
            self._revenue_function,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraint_list,
            options={"maxiter": 1000},
        )

        if not result.success:
            logger.warning(f"Optimization warning: {result.message}")

        # Calculate results
        allocations = {}
        expected_revenue = 0.0
        expected_roi = 0.0

        for i, channel in enumerate(self.channels):
            spend = result.x[i]
            allocations[channel] = float(spend)

            # Calculate expected revenue for this channel
            base_roas = self.marginal_roas[channel]
            saturation_factor = 1.0 / (1.0 + spend / 1000.0)
            effective_roas = base_roas * saturation_factor
            channel_revenue = spend * effective_roas

            expected_revenue += channel_revenue

        expected_roi = expected_revenue / total_budget if total_budget > 0 else 0.0

        # Calculate delta vs current (if provided)
        current_allocation = None  # Would need to be passed in

        return {
            "allocations": allocations,
            "expected_revenue": float(expected_revenue),
            "expected_roi": float(expected_roi),
            "total_budget": float(total_budget),
            "optimization_status": result.success,
            "message": result.message,
        }

    def compare_scenarios(
        self,
        scenarios: List[Dict[str, float]],
        total_budget: float,
    ) -> List[Dict]:
        """
        Compare multiple budget allocation scenarios.

        Args:
            scenarios: List of scenario dictionaries (channel -> spend)
            total_budget: Total budget for validation

        Returns:
            List of scenario results
        """
        results = []

        for i, scenario in enumerate(scenarios):
            # Validate scenario sums to total_budget
            scenario_total = sum(scenario.values())
            if abs(scenario_total - total_budget) > 0.01:
                logger.warning(
                    f"Scenario {i} total ({scenario_total}) doesn't match budget ({total_budget})"
                )

            # Calculate expected revenue
            expected_revenue = 0.0
            for channel, spend in scenario.items():
                if channel in self.marginal_roas:
                    base_roas = self.marginal_roas[channel]
                    saturation_factor = 1.0 / (1.0 + spend / 1000.0)
                    effective_roas = base_roas * saturation_factor
                    expected_revenue += spend * effective_roas

            results.append(
                {
                    "scenario_id": i,
                    "allocations": scenario,
                    "expected_revenue": float(expected_revenue),
                    "expected_roi": float(expected_revenue / total_budget),
                }
            )

        return results


def optimize_budget(
    marginal_roas: Dict[str, float],
    total_budget: float,
    min_spend: Optional[Dict[str, float]] = None,
    max_spend: Optional[Dict[str, float]] = None,
) -> Dict:
    """
    Optimize marketing budget allocation.

    Args:
        marginal_roas: Channel marginal ROAS values
        total_budget: Total budget to allocate
        min_spend: Minimum spend per channel
        max_spend: Maximum spend per channel

    Returns:
        Optimization results
    """
    optimizer = BudgetOptimizer(marginal_roas)
    return optimizer.optimize(total_budget, min_spend, max_spend)

