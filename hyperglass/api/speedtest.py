"""Speed test API endpoints implementation."""

# Standard Library
import os
import time
import asyncio
import secrets
from pathlib import Path
from typing import Optional

# Third Party
from litestar import Request, Response
from litestar.exceptions import HTTPException

# Project
from hyperglass.log import log
from hyperglass.state import use_state


async def handle_speedtest_download(request: Request) -> Response:
    """Handle speed test download endpoint for measuring download speed."""
    
    # Get query parameters
    size = request.query_params.get("size", "10")
    chunk_size = int(request.query_params.get("ckSize", "4"))
    
    try:
        size_mb = int(size)
        if size_mb <= 0 or size_mb > 1000:  # Limit to 1GB max
            raise ValueError("Invalid size")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid size parameter")
    
    # Calculate total bytes
    total_bytes = size_mb * 1024 * 1024
    chunk_bytes = chunk_size * 1024
    
    log.info(f"Starting speed test download: {size_mb}MB")
    
    async def generate_data():
        """Generate random data for download speed test."""
        bytes_sent = 0
        while bytes_sent < total_bytes:
            remaining = min(chunk_bytes, total_bytes - bytes_sent)
            # Generate random data
            chunk = secrets.token_bytes(remaining)
            bytes_sent += len(chunk)
            yield chunk
            
            # Small delay to prevent overwhelming the connection
            await asyncio.sleep(0.001)
    
    return Response(
        content=generate_data(),
        media_type="application/octet-stream",
        headers={
            "Content-Length": str(total_bytes),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )


async def handle_speedtest_upload(request: Request) -> Response:
    """Handle speed test upload endpoint for measuring upload speed."""
    
    start_time = time.time()
    total_bytes = 0
    
    try:
        # Read the uploaded data
        body = await request.body()
        total_bytes = len(body)
        
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        end_time = time.time()
        duration = end_time - start_time
        
        log.info(f"Speed test upload completed: {total_bytes} bytes in {duration:.2f}s")
        
        return Response(
            content={
                "bytes_received": total_bytes,
                "duration": duration,
                "timestamp": int(time.time() * 1000)
            },
            media_type="application/json"
        )
        
    except Exception as e:
        log.error(f"Speed test upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload processing failed")


async def handle_speedtest_file(filename: str, request: Request) -> Response:
    """Handle speed test file download endpoint."""
    
    # Parse filename to get size (e.g., "100MB.bin")
    try:
        if filename.endswith(".bin"):
            size_str = filename[:-4]  # Remove .bin extension
            
            # Parse size (e.g., "100MB", "1GB")
            if size_str.endswith("MB"):
                size_mb = int(size_str[:-2])
            elif size_str.endswith("GB"):
                size_mb = int(size_str[:-2]) * 1024
            else:
                raise ValueError("Invalid file format")
                
            if size_mb <= 0 or size_mb > 10240:  # Limit to 10GB max
                raise ValueError("File size too large")
                
        else:
            raise ValueError("Invalid filename format")
            
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    
    total_bytes = size_mb * 1024 * 1024
    chunk_size = 64 * 1024  # 64KB chunks
    
    log.info(f"Starting file download: {filename} ({size_mb}MB)")
    
    async def generate_file_data():
        """Generate file data for download."""
        bytes_sent = 0
        while bytes_sent < total_bytes:
            remaining = min(chunk_size, total_bytes - bytes_sent)
            # Generate zeros for faster generation
            chunk = b'\x00' * remaining
            bytes_sent += len(chunk)
            yield chunk
            
            # Small delay to prevent overwhelming
            await asyncio.sleep(0.001)
    
    return Response(
        content=generate_file_data(),
        media_type="application/octet-stream",
        headers={
            "Content-Length": str(total_bytes),
            "Content-Disposition": f"attachment; filename={filename}",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )


def get_speedtest_config() -> dict:
    """Get speed test configuration."""
    state = use_state()
    
    # Default configuration
    config = {
        "enabled": True,
        "file_sizes": ["1MB", "10MB", "100MB", "1GB"],
        "max_file_size": "1GB",
        "chunk_size": 4,  # KB
    }
    
    # Override with user configuration if available
    if hasattr(state.params, 'speedtest'):
        user_config = state.params.speedtest
        config.update(user_config)
    
    return config
