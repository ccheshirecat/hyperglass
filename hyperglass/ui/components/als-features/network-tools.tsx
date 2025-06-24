import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  Select,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  FormControl,
  FormLabel,
  Divider,
} from '@chakra-ui/react';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';

interface NetworkToolsProps {
  onClose?: () => void;
}

interface PingResult {
  target: string;
  count: number;
  ipv6: boolean;
  output: string;
  error?: string;
  return_code: number;
  timestamp: number;
}

interface TracerouteResult {
  target: string;
  max_hops: number;
  ipv6: boolean;
  output: string;
  error?: string;
  return_code: number;
  timestamp: number;
}

interface IPerf3Result {
  port: number;
  status: string;
  duration: number;
  commands: {
    ipv4: string;
    ipv6: string;
  };
}

export const NetworkTools: React.FC<NetworkToolsProps> = ({ onClose }) => {
  const config = useConfig();
  const toast = useToast();
  
  // Ping state
  const [pingTarget, setPingTarget] = useState('');
  const [pingCount, setPingCount] = useState(4);
  const [pingIpv6, setPingIpv6] = useState(false);
  const [pingRunning, setPingRunning] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  
  // Traceroute state
  const [traceTarget, setTraceTarget] = useState('');
  const [traceMaxHops, setTraceMaxHops] = useState(30);
  const [traceIpv6, setTraceIpv6] = useState(false);
  const [traceRunning, setTraceRunning] = useState(false);
  const [traceResult, setTraceResult] = useState<TracerouteResult | null>(null);
  
  // iPerf3 state
  const [iperf3Running, setIperf3Running] = useState(false);
  const [iperf3Result, setIperf3Result] = useState<IPerf3Result | null>(null);
  const [iperf3Duration, setIperf3Duration] = useState(300);
  
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  const codeBg = useColorValue('gray.50', 'gray.900');
  
  const runPing = useCallback(async () => {
    if (!pingTarget.trim()) {
      toast({
        title: 'Target required',
        description: 'Please enter a target hostname or IP address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setPingRunning(true);
    setPingResult(null);
    
    try {
      const params = new URLSearchParams({
        target: pingTarget.trim(),
        count: pingCount.toString(),
        ipv6: pingIpv6.toString(),
      });
      
      const response = await fetch(`/api/tools/ping?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Ping failed');
      }
      
      setPingResult(result);
      
      toast({
        title: 'Ping completed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Ping error:', error);
      toast({
        title: 'Ping failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setPingRunning(false);
    }
  }, [pingTarget, pingCount, pingIpv6, toast]);
  
  const runTraceroute = useCallback(async () => {
    if (!traceTarget.trim()) {
      toast({
        title: 'Target required',
        description: 'Please enter a target hostname or IP address',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setTraceRunning(true);
    setTraceResult(null);
    
    try {
      const params = new URLSearchParams({
        target: traceTarget.trim(),
        max_hops: traceMaxHops.toString(),
        ipv6: traceIpv6.toString(),
      });
      
      const response = await fetch(`/api/tools/traceroute?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Traceroute failed');
      }
      
      setTraceResult(result);
      
      toast({
        title: 'Traceroute completed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Traceroute error:', error);
      toast({
        title: 'Traceroute failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setTraceRunning(false);
    }
  }, [traceTarget, traceMaxHops, traceIpv6, toast]);
  
  const startIperf3Server = useCallback(async () => {
    setIperf3Running(true);
    setIperf3Result(null);
    
    try {
      const params = new URLSearchParams({
        action: 'start',
        duration: iperf3Duration.toString(),
      });
      
      const response = await fetch(`/api/tools/iperf3/server?${params}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to start iPerf3 server');
      }
      
      setIperf3Result(result);
      
      toast({
        title: 'iPerf3 server started',
        description: `Server listening on port ${result.port}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('iPerf3 error:', error);
      toast({
        title: 'iPerf3 server failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setIperf3Running(false);
    }
  }, [iperf3Duration, toast]);
  
  const stopIperf3Server = useCallback(async () => {
    if (!iperf3Result?.port) return;
    
    try {
      const params = new URLSearchParams({
        action: 'stop',
        port: iperf3Result.port.toString(),
      });
      
      const response = await fetch(`/api/tools/iperf3/server?${params}`);
      const result = await response.json();
      
      setIperf3Running(false);
      setIperf3Result(null);
      
      toast({
        title: 'iPerf3 server stopped',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('iPerf3 stop error:', error);
      toast({
        title: 'Failed to stop iPerf3 server',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [iperf3Result, toast]);
  
  return (
    <Card bg={bg} borderColor={borderColor} borderWidth="1px">
      <CardHeader>
        <Heading size="md">Network Tools</Heading>
      </CardHeader>
      <CardBody>
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Ping</Tab>
            <Tab>Traceroute</Tab>
            <Tab>iPerf3 Server</Tab>
          </TabList>
          
          <TabPanels>
            {/* Ping Panel */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Target (hostname or IP)</FormLabel>
                  <Input
                    value={pingTarget}
                    onChange={(e) => setPingTarget(e.target.value)}
                    placeholder="example.com or 8.8.8.8"
                    disabled={pingRunning}
                  />
                </FormControl>
                
                <HStack>
                  <FormControl>
                    <FormLabel>Count</FormLabel>
                    <NumberInput
                      value={pingCount}
                      onChange={(_, value) => setPingCount(value)}
                      min={1}
                      max={20}
                      disabled={pingRunning}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>IPv6</FormLabel>
                    <Switch
                      isChecked={pingIpv6}
                      onChange={(e) => setPingIpv6(e.target.checked)}
                      disabled={pingRunning}
                    />
                  </FormControl>
                </HStack>
                
                <Button
                  colorScheme="blue"
                  onClick={runPing}
                  isLoading={pingRunning}
                  loadingText="Running ping..."
                >
                  Run Ping
                </Button>
                
                {pingResult && (
                  <Box>
                    <Heading size="sm" mb={2}>Ping Result</Heading>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={4}
                      bg={codeBg}
                      borderRadius="md"
                      fontSize="sm"
                      maxH="300px"
                      overflowY="auto"
                    >
                      {pingResult.output}
                    </Code>
                    {pingResult.error && (
                      <Alert status="error" mt={2}>
                        <AlertIcon />
                        <AlertDescription>{pingResult.error}</AlertDescription>
                      </Alert>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>
            
            {/* Traceroute Panel */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Target (hostname or IP)</FormLabel>
                  <Input
                    value={traceTarget}
                    onChange={(e) => setTraceTarget(e.target.value)}
                    placeholder="example.com or 8.8.8.8"
                    disabled={traceRunning}
                  />
                </FormControl>
                
                <HStack>
                  <FormControl>
                    <FormLabel>Max Hops</FormLabel>
                    <NumberInput
                      value={traceMaxHops}
                      onChange={(_, value) => setTraceMaxHops(value)}
                      min={1}
                      max={64}
                      disabled={traceRunning}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>IPv6</FormLabel>
                    <Switch
                      isChecked={traceIpv6}
                      onChange={(e) => setTraceIpv6(e.target.checked)}
                      disabled={traceRunning}
                    />
                  </FormControl>
                </HStack>
                
                <Button
                  colorScheme="blue"
                  onClick={runTraceroute}
                  isLoading={traceRunning}
                  loadingText="Running traceroute..."
                >
                  Run Traceroute
                </Button>
                
                {traceResult && (
                  <Box>
                    <Heading size="sm" mb={2}>Traceroute Result</Heading>
                    <Code
                      display="block"
                      whiteSpace="pre-wrap"
                      p={4}
                      bg={codeBg}
                      borderRadius="md"
                      fontSize="sm"
                      maxH="400px"
                      overflowY="auto"
                    >
                      {traceResult.output}
                    </Code>
                    {traceResult.error && (
                      <Alert status="error" mt={2}>
                        <AlertIcon />
                        <AlertDescription>{traceResult.error}</AlertDescription>
                      </Alert>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>
            
            {/* iPerf3 Panel */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <FormLabel>Server Duration (seconds)</FormLabel>
                  <NumberInput
                    value={iperf3Duration}
                    onChange={(_, value) => setIperf3Duration(value)}
                    min={60}
                    max={3600}
                    disabled={iperf3Running}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                
                <HStack>
                  <Button
                    colorScheme="green"
                    onClick={startIperf3Server}
                    disabled={iperf3Running}
                    isLoading={iperf3Running && !iperf3Result}
                    loadingText="Starting server..."
                  >
                    Start iPerf3 Server
                  </Button>
                  
                  {iperf3Running && iperf3Result && (
                    <Button
                      colorScheme="red"
                      onClick={stopIperf3Server}
                    >
                      Stop Server
                    </Button>
                  )}
                </HStack>
                
                {iperf3Result && (
                  <Alert status="success">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>iPerf3 Server Running!</AlertTitle>
                      <AlertDescription>
                        <VStack align="start" spacing={2} mt={2}>
                          <Text>Port: <Badge colorScheme="blue">{iperf3Result.port}</Badge></Text>
                          <Text>Duration: {iperf3Result.duration} seconds</Text>
                          <Divider />
                          <Text fontWeight="bold">Client Commands:</Text>
                          <Code fontSize="sm">{iperf3Result.commands.ipv4}</Code>
                          <Code fontSize="sm">{iperf3Result.commands.ipv6}</Code>
                        </VStack>
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CardBody>
    </Card>
  );
};
