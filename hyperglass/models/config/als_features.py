"""Configuration models for ALS features integration."""

# Standard Library
import typing as t
from pathlib import Path

# Third Party
from pydantic import Field, validator

# Project
from ..main import HyperglassModel


class SpeedTestConfig(HyperglassModel):
    """Speed test configuration."""
    
    enabled: bool = Field(
        default=True,
        description="Enable speed test features"
    )
    
    file_sizes: t.List[str] = Field(
        default=["1MB", "10MB", "100MB", "1GB"],
        description="Available file sizes for download tests"
    )
    
    max_file_size: str = Field(
        default="1GB",
        description="Maximum file size for speed tests"
    )
    
    chunk_size: int = Field(
        default=4,
        description="Chunk size in KB for speed tests",
        ge=1,
        le=1024
    )
    
    upload_enabled: bool = Field(
        default=True,
        description="Enable upload speed tests"
    )
    
    download_enabled: bool = Field(
        default=True,
        description="Enable download speed tests"
    )
    
    @validator('file_sizes')
    def validate_file_sizes(cls, v):
        """Validate file sizes format."""
        valid_units = ['KB', 'MB', 'GB']
        for size in v:
            if not any(size.endswith(unit) for unit in valid_units):
                raise ValueError(f"Invalid file size format: {size}")
            try:
                int(size[:-2])
            except ValueError:
                raise ValueError(f"Invalid file size number: {size}")
        return v


class NetworkToolsConfig(HyperglassModel):
    """Network tools configuration."""
    
    enabled: bool = Field(
        default=True,
        description="Enable network tools"
    )
    
    ping_enabled: bool = Field(
        default=True,
        description="Enable ping tool"
    )
    
    traceroute_enabled: bool = Field(
        default=True,
        description="Enable traceroute tool"
    )
    
    iperf3_enabled: bool = Field(
        default=True,
        description="Enable iperf3 server tool"
    )
    
    iperf3_port_range: t.Tuple[int, int] = Field(
        default=(30000, 31000),
        description="Port range for iperf3 servers"
    )
    
    max_ping_count: int = Field(
        default=20,
        description="Maximum number of ping packets",
        ge=1,
        le=100
    )
    
    max_traceroute_hops: int = Field(
        default=64,
        description="Maximum number of traceroute hops",
        ge=1,
        le=255
    )
    
    ping_timeout: int = Field(
        default=30,
        description="Ping command timeout in seconds",
        ge=5,
        le=120
    )
    
    traceroute_timeout: int = Field(
        default=60,
        description="Traceroute command timeout in seconds",
        ge=10,
        le=300
    )
    
    @validator('iperf3_port_range')
    def validate_port_range(cls, v):
        """Validate iperf3 port range."""
        start, end = v
        if start >= end:
            raise ValueError("Start port must be less than end port")
        if start < 1024 or end > 65535:
            raise ValueError("Ports must be between 1024 and 65535")
        return v


class BandwidthConfig(HyperglassModel):
    """Bandwidth monitoring configuration."""
    
    enabled: bool = Field(
        default=True,
        description="Enable bandwidth monitoring"
    )
    
    update_interval: int = Field(
        default=1,
        description="Update interval in seconds",
        ge=1,
        le=60
    )
    
    history_length: int = Field(
        default=60,
        description="History length in seconds",
        ge=10,
        le=3600
    )
    
    excluded_interfaces: t.List[str] = Field(
        default=["lo", "docker", "br-", "veth"],
        description="Interface prefixes to exclude from monitoring"
    )
    
    auto_start: bool = Field(
        default=True,
        description="Automatically start monitoring on server startup"
    )


class ALSFeatures(HyperglassModel):
    """ALS features configuration."""
    
    speedtest: SpeedTestConfig = Field(
        default_factory=SpeedTestConfig,
        description="Speed test configuration"
    )
    
    network_tools: NetworkToolsConfig = Field(
        default_factory=NetworkToolsConfig,
        description="Network tools configuration"
    )
    
    bandwidth: BandwidthConfig = Field(
        default_factory=BandwidthConfig,
        description="Bandwidth monitoring configuration"
    )
    
    enabled: bool = Field(
        default=True,
        description="Enable all ALS features"
    )
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a specific feature is enabled."""
        if not self.enabled:
            return False
        
        feature_config = getattr(self, feature, None)
        if feature_config and hasattr(feature_config, 'enabled'):
            return feature_config.enabled
        
        return False
