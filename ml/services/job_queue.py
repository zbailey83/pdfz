"""
Redis-based job queue for attribution processing.
"""
import redis
import json
import os
import uuid
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class JobQueue:
    """Redis-based job queue."""
    
    def __init__(self):
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.queue_name = 'attribution_jobs'
        self.job_prefix = 'job:'
    
    def enqueue(self, account_id: str, job_data: Optional[Dict] = None) -> str:
        """
        Add a job to the queue.
        
        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        
        job_info = {
            'job_id': job_id,
            'account_id': account_id,
            'status': 'pending',
            'created_at': str(uuid.uuid1().time),
            **(job_data or {})
        }
        
        # Store job info
        self.redis_client.setex(
            f"{self.job_prefix}{job_id}",
            3600 * 24,  # 24 hours TTL
            json.dumps(job_info)
        )
        
        # Add to queue
        self.redis_client.lpush(self.queue_name, job_id)
        
        logger.info(f"Enqueued job {job_id} for account {account_id}")
        return job_id
    
    def dequeue(self) -> Optional[str]:
        """Get next job from queue (blocking)."""
        result = self.redis_client.brpop(self.queue_name, timeout=1)
        if result:
            return result[1]  # job_id
        return None
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job information."""
        data = self.redis_client.get(f"{self.job_prefix}{job_id}")
        if data:
            return json.loads(data)
        return None
    
    def update_job(self, job_id: str, updates: Dict):
        """Update job status/information."""
        job = self.get_job(job_id)
        if job:
            job.update(updates)
            self.redis_client.setex(
                f"{self.job_prefix}{job_id}",
                3600 * 24,
                json.dumps(job)
            )
    
    def set_status(self, job_id: str, status: str, result: Optional[Dict] = None, error: Optional[str] = None):
        """Update job status."""
        updates = {'status': status}
        if result:
            updates['result'] = result
        if error:
            updates['error'] = error
        self.update_job(job_id, updates)


# Global job queue instance
job_queue = JobQueue()

