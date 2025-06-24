import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Progress,
  Text,
  VStack,
  HStack,
  Badge,
  Select,
  useToast,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
} from '@chakra-ui/react';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';

interface SpeedTestResult {
  downloadSpeed: number;
  uploadSpeed: number;
  ping: number;
  jitter: number;
}

interface SpeedTestProps {
  onClose?: () => void;
}

export const SpeedTest: React.FC<SpeedTestProps> = ({ onClose }) => {
  const config = useConfig();
  const toast = useToast();
  
  const [isRunning, setIsRunning] = useState(false);
  const [testType, setTestType] = useState<'download' | 'upload' | 'both'>('both');
  const [fileSize, setFileSize] = useState('10MB');
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [results, setResults] = useState<Partial<SpeedTestResult>>({});
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  
  const formatSpeed = (bytesPerSecond: number): string => {
    const mbps = (bytesPerSecond * 8) / (1024 * 1024);
    return `${mbps.toFixed(2)} Mbps`;
  };
  
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };
  
  const runDownloadTest = useCallback(async (): Promise<number> => {
    setCurrentTest('Download Test');
    setProgress(0);
    
    const startTime = Date.now();
    let totalBytes = 0;
    
    try {
      const response = await fetch(`/api/speedtest/download?size=${fileSize.replace('MB', '').replace('GB', '')}&ckSize=4`, {
        signal: abortControllerRef.current?.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        totalBytes += value.length;
        const currentProgress = contentLength > 0 ? (totalBytes / contentLength) * 100 : 0;
        setProgress(currentProgress);
        
        // Calculate current speed
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const currentSpeed = totalBytes / elapsed;
          setDownloadSpeed(currentSpeed);
        }
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      return totalBytes / duration;
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
      return 0;
    }
  }, [fileSize]);
  
  const runUploadTest = useCallback(async (): Promise<number> => {
    setCurrentTest('Upload Test');
    setProgress(0);
    
    const sizeInBytes = parseInt(fileSize.replace('MB', '')) * 1024 * 1024;
    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(sizeInBytes / chunkSize);
    
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = new Uint8Array(Math.min(chunkSize, sizeInBytes - i * chunkSize));
        crypto.getRandomValues(chunk);
        
        await fetch('/api/speedtest/upload', {
          method: 'POST',
          body: chunk,
          signal: abortControllerRef.current?.signal,
        });
        
        const currentProgress = ((i + 1) / totalChunks) * 100;
        setProgress(currentProgress);
        
        // Calculate current speed
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const currentSpeed = ((i + 1) * chunkSize) / elapsed;
          setUploadSpeed(currentSpeed);
        }
      }
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      return sizeInBytes / duration;
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
      return 0;
    }
  }, [fileSize]);
  
  const runSpeedTest = useCallback(async () => {
    setIsRunning(true);
    setResults({});
    setProgress(0);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const newResults: Partial<SpeedTestResult> = {};
      
      if (testType === 'download' || testType === 'both') {
        const downloadSpeed = await runDownloadTest();
        newResults.downloadSpeed = downloadSpeed;
      }
      
      if (testType === 'upload' || testType === 'both') {
        const uploadSpeed = await runUploadTest();
        newResults.uploadSpeed = uploadSpeed;
      }
      
      setResults(newResults);
      setCurrentTest('Test Complete');
      
      toast({
        title: 'Speed test completed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('Speed test error:', error);
      toast({
        title: 'Speed test failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setProgress(0);
    }
  }, [testType, runDownloadTest, runUploadTest, toast]);
  
  const stopSpeedTest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setCurrentTest('');
    setProgress(0);
  }, []);
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return (
    <Card bg={bg} borderColor={borderColor} borderWidth="1px">
      <CardHeader>
        <Heading size="md">Network Speed Test</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Test Configuration */}
          <HStack spacing={4}>
            <Box>
              <Text fontSize="sm" mb={2}>Test Type</Text>
              <Select
                value={testType}
                onChange={(e) => setTestType(e.target.value as any)}
                disabled={isRunning}
                size="sm"
              >
                <option value="both">Download & Upload</option>
                <option value="download">Download Only</option>
                <option value="upload">Upload Only</option>
              </Select>
            </Box>
            <Box>
              <Text fontSize="sm" mb={2}>File Size</Text>
              <Select
                value={fileSize}
                onChange={(e) => setFileSize(e.target.value)}
                disabled={isRunning}
                size="sm"
              >
                <option value="1MB">1 MB</option>
                <option value="10MB">10 MB</option>
                <option value="100MB">100 MB</option>
                <option value="1GB">1 GB</option>
              </Select>
            </Box>
          </HStack>
          
          {/* Test Controls */}
          <HStack>
            <Button
              colorScheme="blue"
              onClick={runSpeedTest}
              disabled={isRunning}
              isLoading={isRunning}
              loadingText="Running Test..."
            >
              Start Speed Test
            </Button>
            {isRunning && (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={stopSpeedTest}
              >
                Stop Test
              </Button>
            )}
          </HStack>
          
          {/* Progress */}
          {isRunning && (
            <Box>
              <Text fontSize="sm" mb={2}>{currentTest}</Text>
              <Progress value={progress} colorScheme="blue" size="lg" />
              <Text fontSize="xs" mt={1} color="gray.500">
                {progress.toFixed(1)}% complete
              </Text>
            </Box>
          )}
          
          {/* Real-time Speed Display */}
          {isRunning && (
            <HStack spacing={8} justify="center">
              {(testType === 'download' || testType === 'both') && (
                <Stat textAlign="center">
                  <StatLabel>Download Speed</StatLabel>
                  <StatNumber fontSize="lg">{formatSpeed(downloadSpeed)}</StatNumber>
                </Stat>
              )}
              {(testType === 'upload' || testType === 'both') && (
                <Stat textAlign="center">
                  <StatLabel>Upload Speed</StatLabel>
                  <StatNumber fontSize="lg">{formatSpeed(uploadSpeed)}</StatNumber>
                </Stat>
              )}
            </HStack>
          )}
          
          {/* Results */}
          {Object.keys(results).length > 0 && (
            <>
              <Divider />
              <Box>
                <Heading size="sm" mb={4}>Test Results</Heading>
                <HStack spacing={8} justify="center">
                  {results.downloadSpeed && (
                    <Stat textAlign="center">
                      <StatLabel>Download Speed</StatLabel>
                      <StatNumber color="green.500">
                        {formatSpeed(results.downloadSpeed)}
                      </StatNumber>
                      <StatHelpText>{formatBytes(results.downloadSpeed)}/s</StatHelpText>
                    </Stat>
                  )}
                  {results.uploadSpeed && (
                    <Stat textAlign="center">
                      <StatLabel>Upload Speed</StatLabel>
                      <StatNumber color="blue.500">
                        {formatSpeed(results.uploadSpeed)}
                      </StatNumber>
                      <StatHelpText>{formatBytes(results.uploadSpeed)}/s</StatHelpText>
                    </Stat>
                  )}
                </HStack>
              </Box>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};
