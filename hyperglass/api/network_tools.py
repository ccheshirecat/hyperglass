"""Network tools API endpoints implementation."""

# Standard Library
import asyncio
import subprocess
import json
import time
import socket
import random
from typing import Dict, Any, Optional

# Third Party
from litestar import Request, Response
from litestar.exceptions import HTTPException

# Project
from hyperglass.log import log
from hyperglass.state import use_state


class IPerf3Server:
    """IPerf3 server manager."""
    
    def __init__(self):
        self.processes: Dict[int, subprocess.Popen] = {}
        self.port_range = (30000, 31000)
    
    def get_available_port(self) -> int:
        """Get an available port for iperf3 server."""
        for _ in range(100):  # Try 100 times
            port = random.randint(*self.port_range)
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('', port))
                    return port
            except OSError:
                continue
        raise RuntimeError("No available ports in range")
    
    async def start_server(self, duration: int = 300) -> Dict[str, Any]:
        """Start an iperf3 server instance."""
        try:
            port = self.get_available_port()
            
            # Start iperf3 server
            cmd = [
                "iperf3",
                "-s",
                "-p", str(port),
                "-1",  # Exit after one connection
                "--json"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes[port] = process
            
            log.info(f"Started iperf3 server on port {port}")
            
            return {
                "port": port,
                "status": "started",
                "duration": duration,
                "commands": {
                    "ipv4": f"iperf3 -c <server_ip> -p {port}",
                    "ipv6": f"iperf3 -c <server_ipv6> -p {port}"
                }
            }
            
        except Exception as e:
            log.error(f"Failed to start iperf3 server: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start iperf3 server: {e}")
    
    async def stop_server(self, port: int) -> bool:
        """Stop an iperf3 server instance."""
        if port in self.processes:
            process = self.processes[port]
            process.terminate()
            try:
                await asyncio.wait_for(process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                process.kill()
            del self.processes[port]
            log.info(f"Stopped iperf3 server on port {port}")
            return True
        return False


# Global iperf3 server manager
iperf3_manager = IPerf3Server()


async def handle_iperf3_server(request: Request) -> Response:
    """Handle iperf3 server endpoint."""
    
    action = request.query_params.get("action", "start")
    
    if action == "start":
        duration = int(request.query_params.get("duration", "300"))
        result = await iperf3_manager.start_server(duration)
        return Response(content=result, media_type="application/json")
    
    elif action == "stop":
        port = request.query_params.get("port")
        if not port:
            raise HTTPException(status_code=400, detail="Port parameter required for stop action")
        
        try:
            port_int = int(port)
            success = await iperf3_manager.stop_server(port_int)
            return Response(
                content={"status": "stopped" if success else "not_found", "port": port_int},
                media_type="application/json"
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid port number")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'")


async def handle_network_ping(request: Request) -> Response:
    """Handle network ping endpoint."""
    
    target = request.query_params.get("target")
    count = int(request.query_params.get("count", "4"))
    ipv6 = request.query_params.get("ipv6", "false").lower() == "true"
    
    if not target:
        raise HTTPException(status_code=400, detail="Target parameter required")
    
    # Validate count
    if count < 1 or count > 20:
        raise HTTPException(status_code=400, detail="Count must be between 1 and 20")
    
    # Validate target (basic validation)
    if not target.replace(".", "").replace(":", "").replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid target format")
    
    try:
        # Build ping command
        ping_cmd = "ping6" if ipv6 else "ping"
        cmd = [ping_cmd, "-c", str(count), target]
        
        log.info(f"Running ping: {' '.join(cmd)}")
        
        # Execute ping command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)
        
        result = {
            "target": target,
            "count": count,
            "ipv6": ipv6,
            "output": stdout.decode("utf-8"),
            "error": stderr.decode("utf-8") if stderr else None,
            "return_code": process.returncode,
            "timestamp": int(time.time() * 1000)
        }
        
        return Response(content=result, media_type="application/json")
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Ping command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Ping command not found")
    except Exception as e:
        log.error(f"Ping command failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ping command failed: {e}")


async def handle_traceroute(request: Request) -> Response:
    """Handle network traceroute endpoint."""
    
    target = request.query_params.get("target")
    max_hops = int(request.query_params.get("max_hops", "30"))
    ipv6 = request.query_params.get("ipv6", "false").lower() == "true"
    
    if not target:
        raise HTTPException(status_code=400, detail="Target parameter required")
    
    # Validate max_hops
    if max_hops < 1 or max_hops > 64:
        raise HTTPException(status_code=400, detail="Max hops must be between 1 and 64")
    
    # Validate target (basic validation)
    if not target.replace(".", "").replace(":", "").replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Invalid target format")
    
    try:
        # Build traceroute command
        trace_cmd = "traceroute6" if ipv6 else "traceroute"
        cmd = [trace_cmd, "-m", str(max_hops), target]
        
        log.info(f"Running traceroute: {' '.join(cmd)}")
        
        # Execute traceroute command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=60.0)
        
        result = {
            "target": target,
            "max_hops": max_hops,
            "ipv6": ipv6,
            "output": stdout.decode("utf-8"),
            "error": stderr.decode("utf-8") if stderr else None,
            "return_code": process.returncode,
            "timestamp": int(time.time() * 1000)
        }
        
        return Response(content=result, media_type="application/json")
        
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Traceroute command timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Traceroute command not found")
    except Exception as e:
        log.error(f"Traceroute command failed: {e}")
        raise HTTPException(status_code=500, detail=f"Traceroute command failed: {e}")


def get_network_tools_config() -> dict:
    """Get network tools configuration."""
    state = use_state()
    
    # Default configuration
    config = {
        "ping_enabled": True,
        "traceroute_enabled": True,
        "iperf3_enabled": True,
        "iperf3_port_range": [30000, 31000],
        "max_ping_count": 20,
        "max_traceroute_hops": 64,
    }
    
    # Override with user configuration if available
    if hasattr(state.params, 'network_tools'):
        user_config = state.params.network_tools
        config.update(user_config)
    
    return config
