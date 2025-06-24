import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  useToast,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Switch,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface InterfaceStats {
  current: {
    send_rate: number;
    recv_rate: number;
    send_packets_rate: number;
    recv_packets_rate: number;
    total_sent: number;
    total_recv: number;
    timestamp: number;
  };
  history: Array<{
    timestamp: number;
    send_rate: number;
    recv_rate: number;
    bytes_sent: number;
    bytes_recv: number;
  }>;
}

interface BandwidthData {
  [interfaceName: string]: InterfaceStats;
}

interface BandwidthMonitorProps {
  onClose?: () => void;
}

export const BandwidthMonitor: React.FC<BandwidthMonitorProps> = ({ onClose }) => {
  const config = useConfig();
  const toast = useToast();
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [bandwidthData, setBandwidthData] = useState<BandwidthData>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  const chartBg = useColorValue('rgba(255, 255, 255, 0.8)', 'rgba(26, 32, 44, 0.8)');
  
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };
  
  const formatBitsPerSecond = (bytesPerSecond: number): string => {
    const bitsPerSecond = bytesPerSecond * 8;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
    if (bitsPerSecond === 0) return '0 bps';
    const i = Math.floor(Math.log(bitsPerSecond) / Math.log(1000));
    return `${(bitsPerSecond / Math.pow(1000, i)).toFixed(2)} ${sizes[i]}`;
  };
  
  const fetchBandwidthStats = useCallback(async () => {
    try {
      const response = await fetch('/api/bandwidth/stats?action=get');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setBandwidthData(data);
    } catch (error) {
      console.error('Failed to fetch bandwidth stats:', error);
      if (isMonitoring) {
        toast({
          title: 'Failed to fetch bandwidth data',
          description: error.message,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  }, [isMonitoring, toast]);
  
  const startMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bandwidth/stats?action=start', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      setIsMonitoring(true);
      await fetchBandwidthStats();
      
      toast({
        title: 'Bandwidth monitoring started',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      toast({
        title: 'Failed to start monitoring',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [fetchBandwidthStats, toast]);
  
  const stopMonitoring = useCallback(async () => {
    try {
      const response = await fetch('/api/bandwidth/stats?action=stop', {
        method: 'GET',
      });
      
      setIsMonitoring(false);
      setBandwidthData({});
      
      toast({
        title: 'Bandwidth monitoring stopped',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
      toast({
        title: 'Failed to stop monitoring',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [toast]);
  
  // Auto-refresh effect
  useEffect(() => {
    if (isMonitoring && autoRefresh) {
      intervalRef.current = setInterval(fetchBandwidthStats, 2000); // Update every 2 seconds
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isMonitoring, autoRefresh, fetchBandwidthStats]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const createChartData = (interfaceStats: InterfaceStats) => {
    const history = interfaceStats.history.slice(-30); // Last 30 data points
    const labels = history.map((_, index) => `${index + 1}`);
    
    return {
      labels,
      datasets: [
        {
          label: 'Download',
          data: history.map(h => (h.recv_rate * 8) / (1024 * 1024)), // Convert to Mbps
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Upload',
          data: history.map(h => (h.send_rate * 8) / (1024 * 1024)), // Convert to Mbps
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Speed (Mbps)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time',
        },
      },
    },
    elements: {
      point: {
        radius: 2,
      },
    },
  };
  
  return (
    <Card bg={bg} borderColor={borderColor} borderWidth="1px">
      <CardHeader>
        <Flex justify="space-between" align="center">
          <Heading size="md">Bandwidth Monitor</Heading>
          <HStack>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                Auto-refresh
              </FormLabel>
              <Switch
                id="auto-refresh"
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="sm"
              />
            </FormControl>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Controls */}
          <HStack>
            <Button
              colorScheme={isMonitoring ? "red" : "green"}
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              isLoading={loading}
              loadingText="Starting..."
            >
              {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
            
            {isMonitoring && (
              <Button
                variant="outline"
                onClick={fetchBandwidthStats}
                size="sm"
              >
                Refresh Now
              </Button>
            )}
          </HStack>
          
          {/* Status */}
          {isMonitoring && (
            <Alert status="info">
              <AlertIcon />
              <AlertDescription>
                Monitoring {Object.keys(bandwidthData).length} network interface(s)
              </AlertDescription>
            </Alert>
          )}
          
          {/* Interface Stats */}
          {Object.keys(bandwidthData).length > 0 && (
            <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
              {Object.entries(bandwidthData).map(([interfaceName, stats]) => (
                <GridItem key={interfaceName}>
                  <Card variant="outline">
                    <CardHeader pb={2}>
                      <Heading size="sm">{interfaceName}</Heading>
                    </CardHeader>
                    <CardBody pt={2}>
                      <VStack spacing={4} align="stretch">
                        {/* Current Stats */}
                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                          <Stat>
                            <StatLabel>Download</StatLabel>
                            <StatNumber fontSize="md" color="teal.500">
                              {formatBitsPerSecond(stats.current.recv_rate)}
                            </StatNumber>
                            <StatHelpText>
                              Total: {formatBytes(stats.current.total_recv)}
                            </StatHelpText>
                          </Stat>
                          <Stat>
                            <StatLabel>Upload</StatLabel>
                            <StatNumber fontSize="md" color="red.500">
                              {formatBitsPerSecond(stats.current.send_rate)}
                            </StatNumber>
                            <StatHelpText>
                              Total: {formatBytes(stats.current.total_sent)}
                            </StatHelpText>
                          </Stat>
                        </Grid>
                        
                        {/* Chart */}
                        {stats.history.length > 0 && (
                          <Box height="200px">
                            <Line data={createChartData(stats)} options={chartOptions} />
                          </Box>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          )}
          
          {/* No data message */}
          {!isMonitoring && Object.keys(bandwidthData).length === 0 && (
            <Alert status="info">
              <AlertIcon />
              <AlertDescription>
                Click "Start Monitoring" to begin tracking network interface bandwidth usage.
              </AlertDescription>
            </Alert>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
