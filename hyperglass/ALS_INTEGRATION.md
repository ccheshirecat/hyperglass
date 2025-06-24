# ALS Features Integration

This document describes the integration of ALS (Advanced Looking Glass) features into hyperglass.

## Overview

The ALS integration adds advanced network testing and monitoring capabilities to hyperglass, providing:

- **Speed Testing**: Download/upload speed tests with real-time monitoring
- **Network Tools**: Ping, traceroute, and iperf3 server functionality  
- **Bandwidth Monitoring**: Real-time interface monitoring with historical graphs

## Architecture

### Backend Components

**API Endpoints** (`hyperglass/api/`):
- `speedtest.py` - Speed test implementation
- `network_tools.py` - Network diagnostic tools
- `bandwidth.py` - Bandwidth monitoring
- `als_startup.py` - Initialization and lifecycle management

**Configuration** (`hyperglass/models/config/`):
- `als_features.py` - Pydantic models for ALS configuration
- Integrated into main `params.py` configuration

**Utilities** (`hyperglass/util/`):
- `als_config_validator.py` - Configuration validation and system checks

### Frontend Components

**React Components** (`hyperglass/ui/components/als-features/`):
- `speed-test.tsx` - Speed test interface
- `network-tools.tsx` - Network tools interface  
- `bandwidth-monitor.tsx` - Bandwidth monitoring with charts
- `als-dashboard.tsx` - Full feature dashboard
- `als-summary.tsx` - Compact landing page integration

**Integration**:
- Updated `pages/index.tsx` for responsive layout
- Added TypeScript types in `types/config.ts`
- Integrated with existing Chakra UI theme

## Key Features

### 1. Speed Test

**Implementation**: 
- Streaming download tests with configurable file sizes
- Chunked upload tests with progress tracking
- Real-time speed calculation and display

**API Endpoints**:
- `GET /api/speedtest/download` - Download speed test
- `POST /api/speedtest/upload` - Upload speed test  
- `GET /api/speedtest/file/{filename}` - File-based download test

### 2. Network Tools

**Implementation**:
- Subprocess execution with security controls
- Input validation and sanitization
- Timeout management and resource limits

**Tools**:
- **Ping**: IPv4/IPv6 with configurable count and timeout
- **Traceroute**: Path analysis with hop limits
- **iPerf3**: On-demand bandwidth testing server

**API Endpoints**:
- `GET /api/tools/ping` - Ping utility
- `GET /api/tools/traceroute` - Traceroute utility
- `GET /api/tools/iperf3/server` - iPerf3 server management

### 3. Bandwidth Monitor

**Implementation**:
- psutil-based interface monitoring
- Real-time data collection with configurable intervals
- Chart.js integration for visualization

**Features**:
- Multi-interface monitoring
- Historical data retention
- Interface filtering and exclusion
- Auto-start capability

**API Endpoints**:
- `GET /api/bandwidth/stats` - Bandwidth statistics and control

## Configuration

### Default Configuration

```python
ALSFeatures(
    enabled=True,
    speedtest=SpeedTestConfig(
        enabled=True,
        file_sizes=["1MB", "10MB", "100MB", "1GB"],
        max_file_size="1GB",
        chunk_size=4,
        upload_enabled=True,
        download_enabled=True
    ),
    network_tools=NetworkToolsConfig(
        enabled=True,
        ping_enabled=True,
        traceroute_enabled=True,
        iperf3_enabled=True,
        iperf3_port_range=(30000, 31000),
        max_ping_count=20,
        max_traceroute_hops=64,
        ping_timeout=30,
        traceroute_timeout=60
    ),
    bandwidth=BandwidthConfig(
        enabled=True,
        update_interval=1,
        history_length=60,
        excluded_interfaces=["lo", "docker", "br-", "veth"],
        auto_start=True
    )
)
```

### Validation

Configuration validation includes:
- File size format validation
- Port range validation  
- Timeout and limit validation
- System tool availability checking

## Security Considerations

### Input Validation
- All user inputs are validated and sanitized
- Command injection prevention
- Parameter limits and bounds checking

### Resource Protection
- Timeouts prevent resource exhaustion
- Process limits for concurrent operations
- Memory and bandwidth usage controls

### Network Security
- Configurable port ranges for iperf3
- Interface filtering for monitoring
- Rate limiting recommendations

## Testing

### Unit Tests
- Configuration validation tests
- Model serialization tests
- System requirements checking

### Integration Tests  
- API endpoint testing
- Component rendering tests
- Configuration loading tests

**Run Tests**:
```bash
python -m pytest hyperglass/tests/test_als_features.py -v
```

## Performance Considerations

### Resource Usage
- **Speed Test**: Temporary bandwidth during tests
- **Network Tools**: Minimal CPU for command execution
- **Bandwidth Monitor**: ~1MB memory per interface

### Optimization
- Configurable update intervals
- Interface exclusion for reduced overhead
- Appropriate timeout values
- File size limits for speed tests

## Deployment

### System Requirements
```bash
# Ubuntu/Debian
sudo apt-get install iputils-ping traceroute iperf3

# CentOS/RHEL  
sudo yum install iputils traceroute iperf3

# macOS
brew install iperf3
```

### Frontend Dependencies
Added to `package.json`:
- `chart.js`: Chart visualization
- `react-chartjs-2`: React Chart.js integration

### Configuration Example
```yaml
als_features:
  enabled: true
  speedtest:
    enabled: true
    file_sizes: ["10MB", "100MB"]
  network_tools:
    enabled: true
    iperf3_port_range: [30000, 30100]
  bandwidth:
    enabled: true
    auto_start: true
```

## Troubleshooting

### Common Issues

1. **Missing System Tools**
   - Install required tools (ping, traceroute, iperf3)
   - Verify PATH accessibility

2. **Port Conflicts**
   - Adjust iperf3_port_range
   - Check firewall configuration

3. **Permission Issues**
   - Ensure network interface access
   - Verify command execution permissions

### Debug Mode
Enable detailed logging:
```yaml
logging:
  level: DEBUG
```

### Status Endpoint
Check feature status:
```bash
curl http://localhost:8001/api/als/status
```

## Future Enhancements

Potential improvements:
- WebSocket support for real-time updates
- Additional network tools (mtr, nmap)
- Enhanced visualization options
- Performance metrics and alerting
- Multi-server coordination

## Contributing

To contribute to ALS features:

1. Follow hyperglass development guidelines
2. Add tests for new functionality
3. Update documentation
4. Ensure security best practices
5. Test across different environments

## References

- [Original ALS Project](https://github.com/wikihost-opensource/als)
- [hyperglass Documentation](https://hyperglass.dev)
- [Chart.js Documentation](https://www.chartjs.org)
- [Chakra UI Documentation](https://chakra-ui.com)
