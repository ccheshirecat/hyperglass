"""Tests for ALS features."""

# Standard Library
import pytest
from unittest.mock import patch, MagicMock

# Project
from hyperglass.models.config.als_features import ALSFeatures, SpeedTestConfig, NetworkToolsConfig, BandwidthConfig
from hyperglass.util.als_config_validator import validate_als_config, check_system_requirements


class TestALSConfiguration:
    """Test ALS configuration validation."""
    
    def test_default_config(self):
        """Test default ALS configuration."""
        config = ALSFeatures()
        assert config.enabled is True
        assert config.speedtest.enabled is True
        assert config.network_tools.enabled is True
        assert config.bandwidth.enabled is True
    
    def test_speedtest_config_validation(self):
        """Test speed test configuration validation."""
        # Valid configuration
        config = SpeedTestConfig(
            enabled=True,
            file_sizes=["1MB", "10MB", "100MB"],
            max_file_size="100MB",
            chunk_size=4
        )
        assert config.enabled is True
        assert "1MB" in config.file_sizes
        
        # Invalid file size format
        with pytest.raises(ValueError):
            SpeedTestConfig(file_sizes=["1XB"])  # Invalid unit
        
        # Invalid chunk size
        with pytest.raises(ValueError):
            SpeedTestConfig(chunk_size=0)  # Too small
        
        with pytest.raises(ValueError):
            SpeedTestConfig(chunk_size=2000)  # Too large
    
    def test_network_tools_config_validation(self):
        """Test network tools configuration validation."""
        # Valid configuration
        config = NetworkToolsConfig(
            enabled=True,
            iperf3_port_range=(30000, 31000),
            max_ping_count=10,
            max_traceroute_hops=30
        )
        assert config.enabled is True
        assert config.iperf3_port_range == (30000, 31000)
        
        # Invalid port range
        with pytest.raises(ValueError):
            NetworkToolsConfig(iperf3_port_range=(31000, 30000))  # Start > End
        
        with pytest.raises(ValueError):
            NetworkToolsConfig(iperf3_port_range=(100, 200))  # Ports too low
        
        # Invalid limits
        with pytest.raises(ValueError):
            NetworkToolsConfig(max_ping_count=0)  # Too small
        
        with pytest.raises(ValueError):
            NetworkToolsConfig(max_ping_count=200)  # Too large
    
    def test_bandwidth_config_validation(self):
        """Test bandwidth configuration validation."""
        # Valid configuration
        config = BandwidthConfig(
            enabled=True,
            update_interval=2,
            history_length=120,
            excluded_interfaces=["lo", "docker"]
        )
        assert config.enabled is True
        assert config.update_interval == 2
        
        # Invalid intervals
        with pytest.raises(ValueError):
            BandwidthConfig(update_interval=0)  # Too small
        
        with pytest.raises(ValueError):
            BandwidthConfig(update_interval=100)  # Too large
        
        with pytest.raises(ValueError):
            BandwidthConfig(history_length=5)  # Too small
    
    def test_validate_als_config_valid(self):
        """Test validation of valid ALS configuration."""
        config_data = {
            "als_features": {
                "enabled": True,
                "speedtest": {
                    "enabled": True,
                    "file_sizes": ["1MB", "10MB"],
                    "max_file_size": "10MB"
                },
                "network_tools": {
                    "enabled": True,
                    "iperf3_port_range": [30000, 31000]
                },
                "bandwidth": {
                    "enabled": True,
                    "update_interval": 1
                }
            }
        }
        
        is_valid, errors = validate_als_config(config_data)
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_als_config_invalid(self):
        """Test validation of invalid ALS configuration."""
        config_data = {
            "als_features": {
                "enabled": True,
                "speedtest": {
                    "enabled": True,
                    "file_sizes": ["1XB"],  # Invalid format
                    "chunk_size": 0  # Invalid size
                }
            }
        }
        
        is_valid, errors = validate_als_config(config_data)
        assert is_valid is False
        assert len(errors) > 0
    
    def test_validate_als_config_empty(self):
        """Test validation with no ALS configuration."""
        config_data = {}
        
        is_valid, errors = validate_als_config(config_data)
        assert is_valid is True
        assert len(errors) == 0


class TestSystemRequirements:
    """Test system requirements checking."""
    
    @patch('shutil.which')
    def test_check_system_requirements_all_present(self, mock_which):
        """Test when all required tools are present."""
        mock_which.return_value = "/usr/bin/tool"
        
        requirements_met, missing_tools = check_system_requirements()
        assert requirements_met is True
        assert len(missing_tools) == 0
    
    @patch('shutil.which')
    def test_check_system_requirements_missing_tools(self, mock_which):
        """Test when some tools are missing."""
        def mock_which_side_effect(tool):
            if tool in ['ping', 'traceroute']:
                return "/usr/bin/" + tool
            return None
        
        mock_which.side_effect = mock_which_side_effect
        
        requirements_met, missing_tools = check_system_requirements()
        assert requirements_met is False
        assert len(missing_tools) > 0
        assert any('iperf3' in tool for tool in missing_tools)


class TestALSFeatureIntegration:
    """Test ALS feature integration."""
    
    def test_als_features_model_export(self):
        """Test ALS features model export."""
        config = ALSFeatures()
        exported = config.model_dump()
        
        assert 'enabled' in exported
        assert 'speedtest' in exported
        assert 'network_tools' in exported
        assert 'bandwidth' in exported
    
    def test_feature_enabled_check(self):
        """Test feature enabled checking."""
        config = ALSFeatures()
        
        assert config.is_feature_enabled('speedtest') is True
        assert config.is_feature_enabled('network_tools') is True
        assert config.is_feature_enabled('bandwidth') is True
        
        # Disable all features
        config.enabled = False
        assert config.is_feature_enabled('speedtest') is False
        
        # Re-enable and disable specific feature
        config.enabled = True
        config.speedtest.enabled = False
        assert config.is_feature_enabled('speedtest') is False
        assert config.is_feature_enabled('network_tools') is True
    
    def test_feature_config_inheritance(self):
        """Test that feature configs inherit from main enabled setting."""
        config = ALSFeatures(enabled=False)
        
        # Even if individual features are enabled, main setting should override
        assert config.is_feature_enabled('speedtest') is False
        assert config.is_feature_enabled('network_tools') is False
        assert config.is_feature_enabled('bandwidth') is False


class TestALSAPIEndpoints:
    """Test ALS API endpoints."""

    @pytest.fixture
    def mock_request(self):
        """Mock request object."""
        request = MagicMock()
        request.query_params = {}
        return request

    def test_als_status_endpoint(self, mock_request):
        """Test ALS status endpoint."""
        from hyperglass.api.als_startup import get_als_status

        status = get_als_status()
        assert isinstance(status, dict)
        assert 'enabled' in status
        assert 'features' in status
        assert 'status' in status

    @patch('hyperglass.api.speedtest.secrets.token_bytes')
    def test_speedtest_download_endpoint(self, mock_token_bytes, mock_request):
        """Test speed test download endpoint."""
        from hyperglass.api.speedtest import handle_speedtest_download

        mock_token_bytes.return_value = b'test_data'
        mock_request.query_params = {'size': '1', 'ckSize': '4'}

        # This would normally return a Response object
        # In a real test, we'd use a test client
        pass

    def test_bandwidth_config_validation(self):
        """Test bandwidth configuration validation."""
        from hyperglass.api.bandwidth import get_bandwidth_config

        config = get_bandwidth_config()
        assert isinstance(config, dict)
        assert 'enabled' in config
        assert 'update_interval' in config
        assert 'history_length' in config


if __name__ == "__main__":
    pytest.main([__file__])
