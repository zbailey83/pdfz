"""
Database connection and queries for ML service.
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class Database:
    """Database connection manager."""

    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        """Establish database connection."""
        try:
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL environment variable not set")

            self.conn = psycopg2.connect(database_url)
            logger.info("✅ Database connected (ML service)")
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()

    def get_marketing_data(
        self, account_id: str, days: Optional[int] = None
    ) -> List[Dict]:
        """
        Fetch marketing metrics for an account.

        Args:
            account_id: Account UUID
            days: Number of days to fetch (None = all)

        Returns:
            List of dictionaries with date, channel, spend, revenue
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                query = """
                    SELECT 
                        date,
                        channel,
                        spend,
                        revenue,
                        impressions,
                        clicks,
                        conversions
                    FROM marketing_daily_metrics
                    WHERE account_id = %s
                """
                params = [account_id]

                if days:
                    query += " AND date >= CURRENT_DATE - INTERVAL '%s days'"
                    params.append(days)

                query += " ORDER BY date ASC, channel ASC"

                cur.execute(query, params)
                rows = cur.fetchall()

                # Convert to list of dicts
                result = []
                for row in rows:
                    result.append(
                        {
                            "date": row["date"].isoformat() if row["date"] else None,
                            "channel": row["channel"],
                            "spend": float(row["spend"] or 0),
                            "revenue": float(row["revenue"] or 0),
                            "impressions": int(row["impressions"] or 0),
                            "clicks": int(row["clicks"] or 0),
                            "conversions": int(row["conversions"] or 0),
                        }
                    )

                return result
        except Exception as e:
            logger.error(f"Error fetching marketing data: {e}")
            raise

    def save_attribution_result(
        self,
        account_id: str,
        model_version: str,
        r_squared: float,
        coefficients: Dict,
        contributions: Dict,
        confidence_intervals: Optional[Dict] = None,
    ) -> str:
        """
        Save attribution model results to database.

        Returns:
            Result ID
        """
        try:
            import json
            import uuid
            from datetime import datetime, timedelta

            result_id = str(uuid.uuid4())
            expires_at = datetime.now() + timedelta(days=7)  # Cache for 7 days

            with self.conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO attribution_results 
                    (id, account_id, model_version, r_squared, coefficients, 
                     contributions, confidence_intervals, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        result_id,
                        account_id,
                        model_version,
                        r_squared,
                        json.dumps(coefficients),
                        json.dumps(contributions),
                        (
                            json.dumps(confidence_intervals)
                            if confidence_intervals
                            else None
                        ),
                        expires_at,
                    ],
                )
                self.conn.commit()

            return result_id
        except Exception as e:
            logger.error(f"Error saving attribution result: {e}")
            self.conn.rollback()
            raise

    def get_attribution_result(self, result_id: str) -> Optional[Dict]:
        """Get attribution result from database."""
        try:
            import json

            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM attribution_results
                    WHERE id = %s
                    AND (expires_at IS NULL OR expires_at > NOW())
                    """,
                    [result_id],
                )
                row = cur.fetchone()

                if row:
                    return {
                        "id": row["id"],
                        "account_id": row["account_id"],
                        "model_version": row["model_version"],
                        "r_squared": float(row["r_squared"]),
                        "coefficients": json.loads(row["coefficients"]),
                        "contributions": json.loads(row["contributions"]),
                        "confidence_intervals": (
                            json.loads(row["confidence_intervals"])
                            if row["confidence_intervals"]
                            else None
                        ),
                        "created_at": (
                            row["created_at"].isoformat() if row["created_at"] else None
                        ),
                    }
                return None
        except Exception as e:
            logger.error(f"Error fetching attribution result: {e}")
            raise


# Global database instance
db = Database()
