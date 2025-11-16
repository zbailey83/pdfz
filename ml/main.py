from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
import asyncio
from dotenv import load_dotenv
from services.attribution import calculate_attribution
from services.forecasting import generate_forecast
from services.optimizer import optimize_budget, BudgetOptimizer
from services.database import db
from services.job_queue import job_queue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="MarketingMix AI ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AttributionRequest(BaseModel):
    account_id: str


class AttributionResponse(BaseModel):
    job_id: str
    status: str


class OptimizerRequest(BaseModel):
    account_id: str
    budget: float
    constraints: Optional[Dict] = None


class OptimizerResponse(BaseModel):
    recommendations: Dict[str, float]
    expected_revenue: float
    expected_roi: float


@app.get("/health")
async def health():
    return {"status": "ok"}


async def process_attribution_job(job_id: str, account_id: str):
    """
    Background task to process attribution model.
    """
    try:
        job_queue.set_status(job_id, "processing")
        
        # Fetch data from database
        logger.info(f"Fetching data for account {account_id}")
        data = db.get_marketing_data(account_id, days=180)  # Last 180 days
        
        if len(data) < 60:
            raise ValueError(f"Insufficient data: {len(data)} days. Need at least 60 days.")
        
        logger.info(f"Processing attribution for {len(data)} data points")
        
        # Calculate attribution
        result = calculate_attribution(data)
        
        # Save to database
        result_id = db.save_attribution_result(
            account_id=account_id,
            model_version=result['model_version'],
            r_squared=result['r_squared'],
            coefficients=result['marginal_roas'],
            contributions=result['contributions'],
            confidence_intervals=result.get('confidence_intervals')
        )
        
        result['result_id'] = result_id
        
        # Update job status
        job_queue.set_status(job_id, "completed", result=result)
        logger.info(f"Attribution job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Attribution job {job_id} failed: {e}")
        job_queue.set_status(job_id, "failed", error=str(e))


@app.post("/attribution/run", response_model=AttributionResponse)
async def run_attribution(
    request: AttributionRequest, background_tasks: BackgroundTasks
):
    """
    Trigger attribution model training/run.
    Returns a job_id for async processing.
    """
    # Enqueue job in Redis
    job_id = job_queue.enqueue(request.account_id)
    
    # Start background task
    background_tasks.add_task(process_attribution_job, job_id, request.account_id)
    
    return AttributionResponse(job_id=job_id, status="pending")


@app.get("/attribution/{job_id}")
async def get_attribution_result(job_id: str):
    """
    Get attribution model results.
    """
    job = job_queue.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status = job.get("status", "unknown")
    
    if status == "failed":
        error = job.get("error", "Job failed")
        raise HTTPException(status_code=500, detail=error)
    
    if status == "pending" or status == "processing":
        return {
            "status": status,
            "message": "Job still processing",
            "job_id": job_id
        }
    
    if status == "completed":
        result = job.get("result", {})
        return {
            "status": "completed",
            "data": result
        }
    
    return {"status": status, "job": job}


@app.post("/optimizer/run", response_model=OptimizerResponse)
async def run_optimizer(request: OptimizerRequest):
    """
    Run budget optimization.
    """
    try:
        # Get latest attribution results for marginal ROAS
        # In production, fetch from database
        # For now, we'll need the marginal_roas passed or fetched
        
        # Fetch attribution results from database
        import json
        from psycopg2.extras import RealDictCursor
        
        with db.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT coefficients 
                FROM attribution_results 
                WHERE account_id = %s 
                AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY created_at DESC 
                LIMIT 1
                """,
                [request.account_id]
            )
            row = cur.fetchone()
            
            if not row:
                raise HTTPException(
                    status_code=400,
                    detail="No attribution model found. Please run attribution first."
                )
            
            marginal_roas = json.loads(row['coefficients'])
        
        # Extract constraints from request
        min_spend = request.constraints.get("min_spend", {}) if request.constraints else {}
        max_spend = request.constraints.get("max_spend", {}) if request.constraints else {}
        
        # Optimize
        result = optimize_budget(
            marginal_roas=marginal_roas,
            total_budget=request.budget,
            min_spend=min_spend if min_spend else None,
            max_spend=max_spend if max_spend else None,
        )
        
        return OptimizerResponse(
            recommendations=result["allocations"],
            expected_revenue=result["expected_revenue"],
            expected_roi=result["expected_roi"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Optimizer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast")
async def get_forecast(account_id: str, horizon: int = 30):
    """
    Get revenue forecast using Prophet.
    
    Args:
        account_id: Account UUID
        horizon: Forecast horizon in days (default 30)
    """
    try:
        # Fetch historical data
        data = db.get_marketing_data(account_id, days=180)
        
        if len(data) < 30:
            raise HTTPException(
                status_code=400,
                detail="Insufficient data: need at least 30 days for forecasting"
            )
        
        # Generate forecast
        forecast = generate_forecast(data, horizon=horizon)
        
        return {
            "status": "success",
            "data": forecast
        }
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
