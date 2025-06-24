# ALS Features - Advanced Looking Glass

The ALS (Advanced Looking Glass) features extend hyperglass with comprehensive network testing and monitoring capabilities, inspired by the [ALS project](https://github.com/wikihost-opensource/als).

## Overview

ALS features provide:

- **Speed Test**: Download and upload speed testing with customizable file sizes
- **Network Tools**: Ping, traceroute, and iperf3 server functionality
- **Bandwidth Monitor**: Real-time network interface monitoring with graphs

## Features

### Speed Test

The speed test feature allows users to test their connection speed to your server.

**Capabilities:**
- Download speed tests with various file sizes (1MB to 1GB)
- Upload speed tests with chunked data transfer
- Real-time speed monitoring during tests
- Customizable file sizes and chunk sizes

**Configuration:**
```yaml
als_features:
  speedtest:
    enabled: true
    file_sizes: ["1MB", "10MB", "100MB", "1GB"]
    max_file_size: "1GB"
    chunk_size: 4  # KB
    upload_enabled: true
    download_enabled: true
```

### Network Tools

Network diagnostic tools for troubleshooting connectivity issues.

**Capabilities:**
- **Ping**: IPv4 and IPv6 ping with customizable packet count
- **Traceroute**: Network path analysis with hop limit control
- **iPerf3 Server**: On-demand bandwidth testing server

**Configuration:**
```yaml
als_features:
  network_tools:
    enabled: true
    ping_enabled: true
    traceroute_enabled: true
    iperf3_enabled: true
    iperf3_port_range: [30000, 31000]
    max_ping_count: 20
    max_traceroute_hops: 64
    ping_timeout: 30
    traceroute_timeout: 60
```

### Bandwidth Monitor

Real-time monitoring of network interface bandwidth usage.

**Capabilities:**
- Live bandwidth monitoring for all network interfaces
- Historical data with configurable retention
- Interactive charts showing upload/download rates
- Interface filtering and exclusion

**Configuration:**
```yaml
als_features:
  bandwidth:
    enabled: true
    update_interval: 1  # seconds
    history_length: 60  # seconds
    excluded_interfaces: ["lo", "docker", "br-", "veth"]
    auto_start: true
```

## Installation

### System Requirements

The following system tools are required for full functionality:

- `ping` - IPv4 connectivity testing
- `ping6` - IPv6 connectivity testing  
- `traceroute` - IPv4 path analysis
- `traceroute6` - IPv6 path analysis
- `iperf3` - Bandwidth testing server

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install iputils-ping traceroute iperf3
```

**CentOS/RHEL:**
```bash
sudo yum install iputils traceroute iperf3
# or for newer versions:
sudo dnf install iputils traceroute iperf3
```

**macOS:**
```bash
brew install iperf3
# ping and traceroute are built-in
```

### Configuration

Add the ALS features configuration to your hyperglass configuration file:

```yaml
# Minimal configuration (enables all features with defaults)
als_features:
  enabled: true

# Detailed configuration
als_features:
  enabled: true
  
  speedtest:
    enabled: true
    file_sizes: ["1MB", "10MB", "100MB", "1GB"]
    max_file_size: "1GB"
    chunk_size: 4
    upload_enabled: true
    download_enabled: true
  
  network_tools:
    enabled: true
    ping_enabled: true
    traceroute_enabled: true
    iperf3_enabled: true
    iperf3_port_range: [30000, 31000]
    max_ping_count: 20
    max_traceroute_hops: 64
    ping_timeout: 30
    traceroute_timeout: 60
  
  bandwidth:
    enabled: true
    update_interval: 1
    history_length: 60
    excluded_interfaces: ["lo", "docker", "br-", "veth"]
    auto_start: true
```

## Usage

### Web Interface

The ALS features are integrated into the hyperglass landing page:

1. **Landing Page**: Features are displayed alongside the traditional looking glass form
2. **Feature Cards**: Click on any feature card to open the full interface
3. **Modal Interface**: Tools open in responsive modal windows

### API Endpoints

ALS features provide REST API endpoints for programmatic access:

**Speed Test:**
- `GET /api/speedtest/download?size=10&ckSize=4` - Download speed test
- `POST /api/speedtest/upload` - Upload speed test
- `GET /api/speedtest/file/100MB.bin` - File download test

**Network Tools:**
- `GET /api/tools/ping?target=8.8.8.8&count=4&ipv6=false` - Ping test
- `GET /api/tools/traceroute?target=8.8.8.8&max_hops=30` - Traceroute
- `GET /api/tools/iperf3/server?action=start&duration=300` - iPerf3 server

**Bandwidth Monitor:**
- `GET /api/bandwidth/stats?action=start` - Start monitoring
- `GET /api/bandwidth/stats?action=get` - Get current stats
- `GET /api/bandwidth/stats?action=stop` - Stop monitoring

**Status:**
- `GET /api/als/status` - Get ALS features status

## Security Considerations

### Network Tools Security

- Commands are executed with restricted parameters
- Input validation prevents command injection
- Timeouts prevent resource exhaustion
- Port ranges limit iperf3 server exposure

### Rate Limiting

Consider implementing rate limiting for:
- Speed test endpoints to prevent abuse
- Network tool endpoints to prevent DoS
- Bandwidth monitoring to limit resource usage

### Firewall Configuration

Ensure your firewall allows:
- HTTP/HTTPS traffic for web interface
- iperf3 port range (default: 30000-31000) for bandwidth testing

## Troubleshooting

### Common Issues

**"Missing system tools" warning:**
- Install required system tools (ping, traceroute, iperf3)
- Verify tools are in system PATH

**Speed test not working:**
- Check network connectivity
- Verify sufficient disk space for temporary files
- Check for proxy/firewall interference

**iperf3 server fails to start:**
- Verify port range is available
- Check firewall allows iperf3 ports
- Ensure iperf3 is installed and accessible

**Bandwidth monitoring shows no data:**
- Verify network interfaces exist
- Check interface names aren't excluded
- Ensure sufficient permissions for network stats

### Logs

ALS features log to the standard hyperglass log. Enable debug logging for detailed troubleshooting:

```yaml
logging:
  level: DEBUG
```

### Validation

Use the built-in configuration validator:

```python
from hyperglass.util.als_config_validator import validate_als_config, check_system_requirements

# Validate configuration
is_valid, errors = validate_als_config(config_dict)

# Check system requirements  
requirements_met, missing_tools = check_system_requirements()
```

## Performance Impact

### Resource Usage

- **Speed Test**: Temporary bandwidth usage during tests
- **Network Tools**: Minimal CPU usage for command execution
- **Bandwidth Monitor**: Low CPU usage, ~1MB memory per interface

### Optimization Tips

- Adjust bandwidth monitoring update interval based on needs
- Limit speed test file sizes for lower-bandwidth servers
- Use interface exclusion to reduce monitoring overhead
- Set appropriate timeouts for network tools

## Contributing

ALS features are part of the hyperglass project. To contribute:

1. Fork the hyperglass repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

ALS features are licensed under the same terms as hyperglass (BSD-3-Clause-Clear).
