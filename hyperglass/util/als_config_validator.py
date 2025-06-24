"""ALS Features Configuration Validator."""

# Standard Library
import typing as t
from pathlib import Path

# Project
from hyperglass.log import log
from hyperglass.models.config.als_features import ALSFeatures


def validate_als_config(config_data: t.Dict[str, t.Any]) -> t.Tuple[bool, t.List[str]]:
    """
    Validate ALS features configuration.
    
    Args:
        config_data: Configuration dictionary
        
    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []
    
    try:
        # Extract ALS configuration
        als_config = config_data.get('als_features', {})
        
        if not als_config:
            log.info("No ALS features configuration found, using defaults")
            return True, []
        
        # Validate using Pydantic model
        als_features = ALSFeatures(**als_config)
        
        # Additional validation checks
        errors.extend(_validate_speedtest_config(als_features.speedtest))
        errors.extend(_validate_network_tools_config(als_features.network_tools))
        errors.extend(_validate_bandwidth_config(als_features.bandwidth))
        
        if errors:
            return False, errors
        
        log.info("ALS features configuration is valid")
        return True, []
        
    except Exception as e:
        errors.append(f"ALS configuration validation error: {e}")
        return False, errors


def _validate_speedtest_config(config) -> t.List[str]:
    """Validate speed test configuration."""
    errors = []
    
    if not config.enabled:
        return errors
    
    # Validate file sizes
    valid_units = ['KB', 'MB', 'GB']
    for size in config.file_sizes:
        if not any(size.endswith(unit) for unit in valid_units):
            errors.append(f"Invalid file size format: {size}")
            continue
        
        try:
            size_num = int(size[:-2])
            if size_num <= 0:
                errors.append(f"File size must be positive: {size}")
        except ValueError:
            errors.append(f"Invalid file size number: {size}")
    
    # Validate max file size
    if config.max_file_size not in config.file_sizes:
        log.warning(f"Max file size {config.max_file_size} not in available sizes")
    
    # Validate chunk size
    if config.chunk_size < 1 or config.chunk_size > 1024:
        errors.append("Chunk size must be between 1 and 1024 KB")
    
    return errors


def _validate_network_tools_config(config) -> t.List[str]:
    """Validate network tools configuration."""
    errors = []
    
    if not config.enabled:
        return errors
    
    # Validate port range
    start_port, end_port = config.iperf3_port_range
    if start_port >= end_port:
        errors.append("iPerf3 start port must be less than end port")
    
    if start_port < 1024 or end_port > 65535:
        errors.append("iPerf3 ports must be between 1024 and 65535")
    
    # Validate limits
    if config.max_ping_count < 1 or config.max_ping_count > 100:
        errors.append("Max ping count must be between 1 and 100")
    
    if config.max_traceroute_hops < 1 or config.max_traceroute_hops > 255:
        errors.append("Max traceroute hops must be between 1 and 255")
    
    # Validate timeouts
    if config.ping_timeout < 5 or config.ping_timeout > 120:
        errors.append("Ping timeout must be between 5 and 120 seconds")
    
    if config.traceroute_timeout < 10 or config.traceroute_timeout > 300:
        errors.append("Traceroute timeout must be between 10 and 300 seconds")
    
    return errors


def _validate_bandwidth_config(config) -> t.List[str]:
    """Validate bandwidth monitoring configuration."""
    errors = []
    
    if not config.enabled:
        return errors
    
    # Validate intervals
    if config.update_interval < 1 or config.update_interval > 60:
        errors.append("Update interval must be between 1 and 60 seconds")
    
    if config.history_length < 10 or config.history_length > 3600:
        errors.append("History length must be between 10 and 3600 seconds")
    
    # Validate excluded interfaces
    if not isinstance(config.excluded_interfaces, list):
        errors.append("Excluded interfaces must be a list")
    
    return errors


def check_system_requirements() -> t.Tuple[bool, t.List[str]]:
    """
    Check if system has required tools for ALS features.
    
    Returns:
        Tuple of (requirements_met, missing_tools)
    """
    missing_tools = []
    
    # Check for required system tools
    required_tools = {
        'ping': 'ping command for network connectivity tests',
        'ping6': 'ping6 command for IPv6 connectivity tests',
        'traceroute': 'traceroute command for network path analysis',
        'traceroute6': 'traceroute6 command for IPv6 path analysis',
        'iperf3': 'iperf3 command for bandwidth testing',
    }
    
    import shutil
    
    for tool, description in required_tools.items():
        if not shutil.which(tool):
            missing_tools.append(f"{tool}: {description}")
    
    if missing_tools:
        log.warning(f"Missing system tools: {', '.join([t.split(':')[0] for t in missing_tools])}")
        return False, missing_tools
    
    log.info("All required system tools are available")
    return True, []


def generate_default_config() -> t.Dict[str, t.Any]:
    """Generate default ALS features configuration."""
    default_config = ALSFeatures()
    return default_config.model_dump()


def print_config_help():
    """Print help information about ALS configuration options."""
    help_text = """
ALS Features Configuration Help
==============================

The ALS (Advanced Looking Glass) features add network testing and monitoring
capabilities to hyperglass. Configuration is done through the 'als_features'
section in your hyperglass configuration file.

Main Configuration:
  enabled: true/false - Enable or disable all ALS features

Speed Test Configuration (als_features.speedtest):
  enabled: true/false - Enable speed test features
  file_sizes: List of available file sizes (e.g., ["1MB", "10MB", "100MB"])
  max_file_size: Maximum file size for tests
  chunk_size: Chunk size in KB for data transfer
  upload_enabled: Enable upload speed tests
  download_enabled: Enable download speed tests

Network Tools Configuration (als_features.network_tools):
  enabled: true/false - Enable network tools
  ping_enabled: Enable ping tool
  traceroute_enabled: Enable traceroute tool
  iperf3_enabled: Enable iperf3 server
  iperf3_port_range: Port range for iperf3 servers [start, end]
  max_ping_count: Maximum ping packets (1-100)
  max_traceroute_hops: Maximum traceroute hops (1-255)
  ping_timeout: Ping command timeout in seconds
  traceroute_timeout: Traceroute command timeout in seconds

Bandwidth Monitoring Configuration (als_features.bandwidth):
  enabled: true/false - Enable bandwidth monitoring
  update_interval: Update frequency in seconds
  history_length: Data history length in seconds
  excluded_interfaces: List of interface prefixes to exclude
  auto_start: Automatically start monitoring on server startup

Example minimal configuration:
  als_features:
    enabled: true

For more examples, see: hyperglass/examples/config-als-features.yaml
"""
    print(help_text)


if __name__ == "__main__":
    print_config_help()
