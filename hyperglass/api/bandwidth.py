"""Bandwidth monitoring API endpoints implementation."""

# Standard Library
import time
import asyncio
import psutil
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque

# Third Party
from litestar import Request, Response
from litestar.exceptions import HTTPException

# Project
from hyperglass.log import log
from hyperglass.state import use_state


class BandwidthMonitor:
    """Bandwidth monitoring class."""
    
    def __init__(self):
        self.interface_stats: Dict[str, deque] = defaultdict(lambda: deque(maxlen=60))
        self.last_stats: Dict[str, Dict] = {}
        self.monitoring = False
        self.monitor_task: Optional[asyncio.Task] = None
    
    async def start_monitoring(self):
        """Start bandwidth monitoring."""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        log.info("Started bandwidth monitoring")
    
    async def stop_monitoring(self):
        """Stop bandwidth monitoring."""
        if not self.monitoring:
            return
        
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        log.info("Stopped bandwidth monitoring")
    
    async def _monitor_loop(self):
        """Main monitoring loop."""
        try:
            while self.monitoring:
                await self._collect_stats()
                await asyncio.sleep(1)  # Collect stats every second
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.error(f"Bandwidth monitoring error: {e}")
    
    async def _collect_stats(self):
        """Collect network interface statistics."""
        try:
            current_time = time.time()
            net_io = psutil.net_io_counters(pernic=True)
            
            for interface, stats in net_io.items():
                # Skip loopback and virtual interfaces
                if interface.startswith(('lo', 'docker', 'br-', 'veth')):
                    continue
                
                current_stats = {
                    'timestamp': current_time,
                    'bytes_sent': stats.bytes_sent,
                    'bytes_recv': stats.bytes_recv,
                    'packets_sent': stats.packets_sent,
                    'packets_recv': stats.packets_recv,
                }
                
                # Calculate rates if we have previous data
                if interface in self.last_stats:
                    last = self.last_stats[interface]
                    time_diff = current_time - last['timestamp']
                    
                    if time_diff > 0:
                        current_stats.update({
                            'send_rate': (stats.bytes_sent - last['bytes_sent']) / time_diff,
                            'recv_rate': (stats.bytes_recv - last['bytes_recv']) / time_diff,
                            'send_packets_rate': (stats.packets_sent - last['packets_sent']) / time_diff,
                            'recv_packets_rate': (stats.packets_recv - last['packets_recv']) / time_diff,
                        })
                    else:
                        current_stats.update({
                            'send_rate': 0,
                            'recv_rate': 0,
                            'send_packets_rate': 0,
                            'recv_packets_rate': 0,
                        })
                else:
                    current_stats.update({
                        'send_rate': 0,
                        'recv_rate': 0,
                        'send_packets_rate': 0,
                        'recv_packets_rate': 0,
                    })
                
                self.interface_stats[interface].append(current_stats)
                self.last_stats[interface] = current_stats
                
        except Exception as e:
            log.error(f"Error collecting network stats: {e}")
    
    def get_current_stats(self) -> Dict[str, Any]:
        """Get current bandwidth statistics."""
        result = {}
        
        for interface, stats_deque in self.interface_stats.items():
            if not stats_deque:
                continue
            
            latest = stats_deque[-1]
            history = list(stats_deque)
            
            result[interface] = {
                'current': {
                    'send_rate': latest.get('send_rate', 0),
                    'recv_rate': latest.get('recv_rate', 0),
                    'send_packets_rate': latest.get('send_packets_rate', 0),
                    'recv_packets_rate': latest.get('recv_packets_rate', 0),
                    'total_sent': latest.get('bytes_sent', 0),
                    'total_recv': latest.get('bytes_recv', 0),
                    'timestamp': latest.get('timestamp', 0),
                },
                'history': history[-30:],  # Last 30 seconds
            }
        
        return result
    
    def get_interface_info(self) -> Dict[str, Any]:
        """Get network interface information."""
        interfaces = {}
        
        try:
            net_if_addrs = psutil.net_if_addrs()
            net_if_stats = psutil.net_if_stats()
            
            for interface, addrs in net_if_addrs.items():
                # Skip loopback and virtual interfaces
                if interface.startswith(('lo', 'docker', 'br-', 'veth')):
                    continue
                
                interface_info = {
                    'name': interface,
                    'addresses': [],
                    'is_up': False,
                    'speed': 0,
                    'mtu': 0,
                }
                
                # Get addresses
                for addr in addrs:
                    if addr.family.name in ('AF_INET', 'AF_INET6'):
                        interface_info['addresses'].append({
                            'family': addr.family.name,
                            'address': addr.address,
                            'netmask': addr.netmask,
                        })
                
                # Get interface stats
                if interface in net_if_stats:
                    stats = net_if_stats[interface]
                    interface_info.update({
                        'is_up': stats.isup,
                        'speed': stats.speed,
                        'mtu': stats.mtu,
                    })
                
                interfaces[interface] = interface_info
                
        except Exception as e:
            log.error(f"Error getting interface info: {e}")
        
        return interfaces


# Global bandwidth monitor
bandwidth_monitor = BandwidthMonitor()


async def handle_bandwidth_stats(request: Request) -> Response:
    """Handle bandwidth statistics endpoint."""
    
    action = request.query_params.get("action", "get")
    
    if action == "start":
        await bandwidth_monitor.start_monitoring()
        return Response(
            content={"status": "started", "message": "Bandwidth monitoring started"},
            media_type="application/json"
        )
    
    elif action == "stop":
        await bandwidth_monitor.stop_monitoring()
        return Response(
            content={"status": "stopped", "message": "Bandwidth monitoring stopped"},
            media_type="application/json"
        )
    
    elif action == "get":
        stats = bandwidth_monitor.get_current_stats()
        return Response(content=stats, media_type="application/json")
    
    elif action == "interfaces":
        interfaces = bandwidth_monitor.get_interface_info()
        return Response(content=interfaces, media_type="application/json")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'start', 'stop', 'get', or 'interfaces'")


def format_bytes(bytes_value: float) -> str:
    """Format bytes to human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.2f} PB"


def get_bandwidth_config() -> dict:
    """Get bandwidth monitoring configuration."""
    state = use_state()
    
    # Default configuration
    config = {
        "enabled": True,
        "update_interval": 1,  # seconds
        "history_length": 60,  # seconds
        "excluded_interfaces": ["lo", "docker", "br-", "veth"],
    }
    
    # Override with user configuration if available
    if hasattr(state.params, 'bandwidth'):
        user_config = state.params.bandwidth
        config.update(user_config)
    
    return config
