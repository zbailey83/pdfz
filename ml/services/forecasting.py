"""
Forecasting service using Prophet for revenue prediction.
"""
import pandas as pd
import numpy as np
from prophet import Prophet
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ForecastingService:
    """Revenue forecasting using Prophet with marketing spend regressors."""

    def __init__(self):
        self.model: Optional[Prophet] = None

    def prepare_data(
        self, data: List[Dict], channels: List[str]
    ) -> Tuple[pd.DataFrame, Dict[str, pd.Series]]:
        """
        Prepare data for Prophet forecasting.

        Args:
            data: List of marketing metrics dictionaries
            channels: List of channel names

        Returns:
            Tuple of (revenue DataFrame, channel spend Series dict)
        """
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["date"])

        # Aggregate revenue by date
        revenue_df = df.groupby("date")["revenue"].sum().reset_index()
        revenue_df.columns = ["ds", "y"]  # Prophet expects 'ds' and 'y'

        # Create spend regressors per channel
        channel_spends = {}
        for channel in channels:
            channel_data = df[df["channel"] == channel].groupby("date")["spend"].sum()
            channel_spends[channel] = channel_data

        return revenue_df, channel_spends

    def fit(
        self,
        revenue_df: pd.DataFrame,
        channel_spends: Dict[str, pd.Series],
        horizon: int = 30,
    ) -> Prophet:
        """
        Fit Prophet model with marketing spend regressors.

        Args:
            revenue_df: DataFrame with 'ds' (date) and 'y' (revenue)
            channel_spends: Dictionary of channel -> spend Series
            horizon: Forecast horizon in days

        Returns:
            Fitted Prophet model
        """
        # Initialize Prophet with seasonality settings
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",
        )

        # Add channel spend as regressors
        for channel, spend_series in channel_spends.items():
            # Merge spend data with revenue dates
            spend_df = pd.DataFrame({"ds": revenue_df["ds"], channel: 0.0})
            for date, value in spend_series.items():
                if date in spend_df["ds"].values:
                    spend_df.loc[spend_df["ds"] == date, channel] = value

            # Add regressor
            model.add_regressor(channel, mode="multiplicative")

            # Merge into revenue_df for training
            revenue_df = revenue_df.merge(
                spend_df[["ds", channel]], on="ds", how="left"
            )
            revenue_df[channel] = revenue_df[channel].fillna(0)

        # Fit model
        model.fit(revenue_df)

        self.model = model
        return model

    def forecast(
        self,
        channel_spends: Dict[str, pd.Series],
        horizon: int = 30,
        future_spend: Optional[Dict[str, List[float]]] = None,
    ) -> Dict:
        """
        Generate revenue forecast.

        Args:
            channel_spends: Historical channel spend data
            horizon: Number of days to forecast
            future_spend: Optional future spend per channel (for scenario planning)

        Returns:
            Dictionary with forecast data and components
        """
        if self.model is None:
            raise ValueError("Model must be fitted before forecasting")

        # Create future dataframe
        future = self.model.make_future_dataframe(periods=horizon)

        # Add future regressor values
        if future_spend:
            # Use provided future spend
            for channel, spend_values in future_spend.items():
                if channel in self.model.regressors:
                    # Pad with zeros if needed
                    while len(spend_values) < horizon:
                        spend_values.append(0.0)
                    future[channel] = [0.0] * (len(future) - horizon) + spend_values[
                        :horizon
                    ]
        else:
            # Use average historical spend for future periods
            for channel in self.model.regressors:
                if channel in channel_spends:
                    avg_spend = channel_spends[channel].mean()
                    future[channel] = [0.0] * (len(future) - horizon) + [
                        avg_spend
                    ] * horizon

        # Generate forecast
        forecast = self.model.predict(future)

        # Extract forecast components
        forecast_tail = forecast.tail(horizon)

        return {
            "forecast": forecast_tail[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_dict(
                "records"
            ),
            "trend": forecast_tail["trend"].tolist(),
            "seasonal": forecast_tail["weekly"].tolist(),
            "point_forecast": forecast_tail["yhat"].tolist(),
            "lower_bound": forecast_tail["yhat_lower"].tolist(),
            "upper_bound": forecast_tail["yhat_upper"].tolist(),
            "horizon": horizon,
        }


def generate_forecast(
    data: List[Dict],
    horizon: int = 30,
    channels: Optional[List[str]] = None,
    future_spend: Optional[Dict[str, List[float]]] = None,
) -> Dict:
    """
    Generate revenue forecast for marketing data.

    Args:
        data: Historical marketing metrics
        horizon: Forecast horizon in days
        channels: List of channels (auto-detected if None)
        future_spend: Optional future spend scenarios

    Returns:
        Forecast results dictionary
    """
    if not data:
        raise ValueError("No data provided for forecasting")

    # Auto-detect channels if not provided
    if channels is None:
        df = pd.DataFrame(data)
        channels = df["channel"].unique().tolist()

    service = ForecastingService()
    revenue_df, channel_spends = service.prepare_data(data, channels)
    service.fit(revenue_df, channel_spends, horizon)
    forecast = service.forecast(channel_spends, horizon, future_spend)

    return forecast

