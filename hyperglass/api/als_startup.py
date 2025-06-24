"""ALS Features Startup and Initialization."""

# Standard Library
import asyncio
from typing import Optional

# Project
from hyperglass.log import log
from hyperglass.state import use_state
from hyperglass.util.als_config_validator import validate_als_config, check_system_requirements


async def initialize_als_features() -> bool:
    """
    Initialize ALS features on application startup.
    
    Returns:
        True if initialization was successful, False otherwise
    """
    try:
        state = use_state()
        
        # Check if ALS features are enabled
        als_config = getattr(state.params, 'als_features', None)
        if not als_config or not als_config.enabled:
            log.info("ALS features are disabled")
            return True
        
        log.info("Initializing ALS features...")
        
        # Validate configuration
        config_dict = state.params.model_dump()
        is_valid, errors = validate_als_config(config_dict)
        
        if not is_valid:
            log.error("ALS configuration validation failed:")
            for error in errors:
                log.error(f"  - {error}")
            return False
        
        # Check system requirements
        requirements_met, missing_tools = check_system_requirements()
        if not requirements_met:
            log.warning("Some ALS features may not work due to missing system tools:")
            for tool in missing_tools:
                log.warning(f"  - {tool}")
        
        # Initialize bandwidth monitoring if enabled and auto_start is True
        if als_config.bandwidth.enabled and als_config.bandwidth.auto_start:
            await start_bandwidth_monitoring()
        
        # Log enabled features
        enabled_features = []
        if als_config.speedtest.enabled:
            enabled_features.append("Speed Test")
        if als_config.network_tools.enabled:
            enabled_features.append("Network Tools")
        if als_config.bandwidth.enabled:
            enabled_features.append("Bandwidth Monitor")
        
        log.info(f"ALS features initialized successfully. Enabled: {', '.join(enabled_features)}")
        return True
        
    except Exception as e:
        log.error(f"Failed to initialize ALS features: {e}")
        return False


async def start_bandwidth_monitoring() -> bool:
    """
    Start bandwidth monitoring if configured to auto-start.
    
    Returns:
        True if started successfully, False otherwise
    """
    try:
        # Import here to avoid circular imports
        from .bandwidth import bandwidth_monitor
        
        await bandwidth_monitor.start_monitoring()
        log.info("Bandwidth monitoring started automatically")
        return True
        
    except Exception as e:
        log.error(f"Failed to start bandwidth monitoring: {e}")
        return False


async def shutdown_als_features() -> None:
    """Shutdown ALS features gracefully."""
    try:
        state = use_state()
        als_config = getattr(state.params, 'als_features', None)
        
        if not als_config or not als_config.enabled:
            return
        
        log.info("Shutting down ALS features...")
        
        # Stop bandwidth monitoring
        if als_config.bandwidth.enabled:
            try:
                from .bandwidth import bandwidth_monitor
                await bandwidth_monitor.stop_monitoring()
                log.info("Bandwidth monitoring stopped")
            except Exception as e:
                log.error(f"Error stopping bandwidth monitoring: {e}")
        
        # Stop any running iperf3 servers
        if als_config.network_tools.enabled and als_config.network_tools.iperf3_enabled:
            try:
                from .network_tools import iperf3_manager
                # Stop all running servers
                for port in list(iperf3_manager.processes.keys()):
                    await iperf3_manager.stop_server(port)
                log.info("All iperf3 servers stopped")
            except Exception as e:
                log.error(f"Error stopping iperf3 servers: {e}")
        
        log.info("ALS features shutdown complete")
        
    except Exception as e:
        log.error(f"Error during ALS features shutdown: {e}")


def get_als_status() -> dict:
    """
    Get current status of ALS features.
    
    Returns:
        Dictionary with status information
    """
    try:
        state = use_state()
        als_config = getattr(state.params, 'als_features', None)
        
        if not als_config:
            return {
                "enabled": False,
                "features": {},
                "status": "not_configured"
            }
        
        status = {
            "enabled": als_config.enabled,
            "features": {
                "speedtest": {
                    "enabled": als_config.speedtest.enabled,
                    "file_sizes": als_config.speedtest.file_sizes,
                    "upload_enabled": als_config.speedtest.upload_enabled,
                    "download_enabled": als_config.speedtest.download_enabled,
                },
                "network_tools": {
                    "enabled": als_config.network_tools.enabled,
                    "ping_enabled": als_config.network_tools.ping_enabled,
                    "traceroute_enabled": als_config.network_tools.traceroute_enabled,
                    "iperf3_enabled": als_config.network_tools.iperf3_enabled,
                },
                "bandwidth": {
                    "enabled": als_config.bandwidth.enabled,
                    "auto_start": als_config.bandwidth.auto_start,
                    "update_interval": als_config.bandwidth.update_interval,
                },
            },
            "status": "configured"
        }
        
        # Add runtime status
        if als_config.enabled:
            # Check if bandwidth monitoring is running
            try:
                from .bandwidth import bandwidth_monitor
                status["features"]["bandwidth"]["running"] = bandwidth_monitor.monitoring
            except:
                status["features"]["bandwidth"]["running"] = False
            
            # Check running iperf3 servers
            try:
                from .network_tools import iperf3_manager
                status["features"]["network_tools"]["iperf3_servers"] = list(iperf3_manager.processes.keys())
            except:
                status["features"]["network_tools"]["iperf3_servers"] = []
        
        return status
        
    except Exception as e:
        log.error(f"Error getting ALS status: {e}")
        return {
            "enabled": False,
            "features": {},
            "status": "error",
            "error": str(e)
        }


# Event handlers for application lifecycle
async def on_startup():
    """Application startup event handler."""
    await initialize_als_features()


async def on_shutdown():
    """Application shutdown event handler."""
    await shutdown_als_features()
