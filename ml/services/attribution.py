"""
Attribution model service using Ridge regression with lagged features.
"""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.utils import resample
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class AttributionModel:
    """
    Marketing attribution model using regularized linear regression.
    """
    
    def __init__(self, alpha: float = 1.0, lags: List[int] = [7, 14, 30]):
        self.alpha = alpha
        self.lags = lags
        self.model = Ridge(alpha=alpha)
        self.scaler = StandardScaler()
        self.channel_names: List[str] = []
        self.is_fitted = False
    
    def _create_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Create feature matrix with lagged spend and seasonality indicators.
        
        Args:
            df: DataFrame with columns [date, channel, spend, revenue]
            
        Returns:
            X: Feature matrix
            y: Target variable (revenue)
        """
        # Pivot to get spend per channel per day
        spend_pivot = df.pivot_table(
            index='date',
            columns='channel',
            values='spend',
            fill_value=0
        )
        
        # Aggregate revenue by date
        revenue_series = df.groupby('date')['revenue'].sum()
        
        # Align dates
        common_dates = spend_pivot.index.intersection(revenue_series.index)
        spend_pivot = spend_pivot.loc[common_dates]
        revenue_series = revenue_series.loc[common_dates]
        
        # Create lagged features
        features = [spend_pivot]
        
        for lag in self.lags:
            lagged = spend_pivot.shift(lag).fillna(0)
            lagged.columns = [f"{col}_lag{lag}" for col in lagged.columns]
            features.append(lagged)
        
        # Add seasonality indicators
        spend_pivot['day_of_week'] = pd.to_datetime(spend_pivot.index).dayofweek
        spend_pivot['month'] = pd.to_datetime(spend_pivot.index).month
        
        # One-hot encode day of week and month
        day_dummies = pd.get_dummies(spend_pivot['day_of_week'], prefix='dow')
        month_dummies = pd.get_dummies(spend_pivot['month'], prefix='month')
        
        # Combine all features
        X = pd.concat(features + [day_dummies, month_dummies], axis=1).fillna(0)
        
        return X, revenue_series
    
    def fit(self, df: pd.DataFrame) -> Dict:
        """
        Train the attribution model.
        
        Args:
            df: DataFrame with columns [date, channel, spend, revenue]
            
        Returns:
            Dictionary with model metrics
        """
        try:
            X, y = self._create_features(df)
            
            if len(X) < 60:
                raise ValueError("Insufficient data: need at least 60 days")
            
            # Store channel names
            self.channel_names = [col for col in X.columns if not col.startswith(('dow_', 'month_', '_lag'))]
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Fit model
            self.model.fit(X_scaled, y)
            self.is_fitted = True
            
            # Calculate metrics
            y_pred = self.model.predict(X_scaled)
            r_squared = self.model.score(X_scaled, y)
            
            # Calculate MAPE
            mape = np.mean(np.abs((y - y_pred) / (y + 1e-10))) * 100
            
            # Get coefficients for channels (marginal ROAS)
            coefficients = {}
            contributions = {}
            
            for i, channel in enumerate(self.channel_names):
                if channel in X.columns:
                    idx = list(X.columns).index(channel)
                    coef = self.model.coef_[idx]
                    coefficients[channel] = float(coef)
                    
                    # Contribution = coefficient * total spend for channel
                    channel_spend = df[df['channel'] == channel]['spend'].sum()
                    contributions[channel] = float(coef * channel_spend)
            
            # Calculate confidence intervals using bootstrap
            # Pass original X DataFrame for proper feature mapping
            confidence_intervals = self._calculate_confidence_intervals(X_scaled, y, X_df=X, n_bootstrap=100)
            
            return {
                'r_squared': float(r_squared),
                'mape': float(mape),
                'coefficients': coefficients,
                'contributions': contributions,
                'confidence_intervals': confidence_intervals,
                'n_samples': len(X)
            }
            
        except Exception as e:
            logger.error(f"Error fitting attribution model: {e}")
            raise
    
    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """
        Predict revenue for given spend data.
        
        Args:
            df: DataFrame with columns [date, channel, spend]
            
        Returns:
            Predicted revenue array
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before prediction")
        
        X, _ = self._create_features(df)
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def get_marginal_roas(self) -> Dict[str, float]:
        """
        Get marginal ROAS for each channel.
        
        Returns:
            Dictionary mapping channel names to marginal ROAS
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")
        
        roas = {}
        for i, channel in enumerate(self.channel_names):
            if channel in self.model.feature_names_in_ if hasattr(self.model, 'feature_names_in_') else []:
                idx = list(self.model.feature_names_in_).index(channel)
                roas[channel] = float(self.model.coef_[idx])
        
        return roas
    
    def _calculate_confidence_intervals(
        self,
        X: np.ndarray,
        y: np.ndarray,
        X_df: Optional[pd.DataFrame] = None,
        n_bootstrap: int = 100,
        confidence_level: float = 0.95
    ) -> Dict[str, Dict[str, float]]:
        """
        Calculate confidence intervals for coefficients using bootstrap.
        
        Returns:
            Dictionary mapping channel names to confidence intervals
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted first")
        
        n_samples = len(X)
        bootstrap_coefs = []
        
        # Bootstrap sampling
        for _ in range(n_bootstrap):
            indices = resample(range(n_samples), n_samples=n_samples, random_state=None)
            X_boot = X[indices]
            y_boot = y.iloc[indices] if hasattr(y, 'iloc') else y[indices]
            
            # Fit model on bootstrap sample
            model_boot = Ridge(alpha=self.alpha)
            model_boot.fit(X_boot, y_boot)
            bootstrap_coefs.append(model_boot.coef_)
        
        bootstrap_coefs = np.array(bootstrap_coefs)
        
        # Calculate percentiles
        alpha = 1 - confidence_level
        lower_percentile = (alpha / 2) * 100
        upper_percentile = (1 - alpha / 2) * 100
        
        confidence_intervals = {}
        
        # Map channel names to feature indices
        # Channels are the first features (before lags and seasonality)
        if X_df is not None:
            # Use DataFrame column names
            for channel in self.channel_names:
                if channel in X_df.columns:
                    idx = list(X_df.columns).index(channel)
                    if idx < bootstrap_coefs.shape[1]:
                        coefs = bootstrap_coefs[:, idx]
                        lower = np.percentile(coefs, lower_percentile)
                        upper = np.percentile(coefs, upper_percentile)
                        mean_coef = float(self.model.coef_[idx])
                        
                        confidence_intervals[channel] = {
                            'lower': float(lower),
                            'upper': float(upper),
                            'mean': mean_coef
                        }
        else:
            # Fallback: assume channels are first N features
            for i, channel in enumerate(self.channel_names):
                if i < bootstrap_coefs.shape[1]:
                    coefs = bootstrap_coefs[:, i]
                    lower = np.percentile(coefs, lower_percentile)
                    upper = np.percentile(coefs, upper_percentile)
                    mean_coef = float(self.model.coef_[i])
                    
                    confidence_intervals[channel] = {
                        'lower': float(lower),
                        'upper': float(upper),
                        'mean': mean_coef
                    }
        
        return confidence_intervals


def calculate_attribution(
    data: List[Dict],
    alpha: float = 1.0,
    lags: List[int] = [7, 14, 30]
) -> Dict:
    """
    Calculate attribution for marketing data.
    
    Args:
        data: List of dictionaries with date, channel, spend, revenue
        alpha: Ridge regression regularization parameter
        lags: List of lag days to include
        
    Returns:
        Dictionary with attribution results
    """
    df = pd.DataFrame(data)
    df['date'] = pd.to_datetime(df['date'])
    
    model = AttributionModel(alpha=alpha, lags=lags)
    metrics = model.fit(df)
    
    return {
        'model_version': 'ridge_v1',
        'r_squared': metrics['r_squared'],
        'mape': metrics['mape'],
        'marginal_roas': metrics['coefficients'],
        'contributions': metrics['contributions'],
        'confidence_intervals': metrics.get('confidence_intervals', {}),
        'n_samples': metrics['n_samples']
    }

