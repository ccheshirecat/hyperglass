import React, { useState } from 'react';
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
  SimpleGrid,
  Icon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FiWifi, FiActivity, FiZap, FiMonitor } from 'react-icons/fi';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';
import { SpeedTest } from './speed-test';
import { NetworkTools } from './network-tools';
import { BandwidthMonitor } from './bandwidth-monitor';

interface ALSDashboardProps {
  onClose?: () => void;
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  colorScheme: string;
  onClick: () => void;
  disabled?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  colorScheme,
  onClick,
  disabled = false,
}) => {
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  const hoverBg = useColorValue('gray.50', 'gray.700');
  
  return (
    <Card
      bg={bg}
      borderColor={borderColor}
      borderWidth="1px"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.6 : 1}
      _hover={disabled ? {} : { bg: hoverBg, transform: 'translateY(-2px)' }}
      transition="all 0.2s"
      onClick={disabled ? undefined : onClick}
    >
      <CardBody>
        <VStack spacing={4} align="center" textAlign="center">
          <Icon as={icon} boxSize={8} color={`${colorScheme}.500`} />
          <Heading size="md">{title}</Heading>
          <Text fontSize="sm" color="gray.500">
            {description}
          </Text>
          {disabled && (
            <Badge colorScheme="red" variant="subtle">
              Disabled
            </Badge>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export const ALSDashboard: React.FC<ALSDashboardProps> = ({ onClose }) => {
  const config = useConfig();
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure();
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  
  // Check if ALS features are enabled in config
  const alsConfig = config.alsFeatures || {};
  const speedTestEnabled = alsConfig.speedtest?.enabled ?? true;
  const networkToolsEnabled = alsConfig.networkTools?.enabled ?? true;
  const bandwidthEnabled = alsConfig.bandwidth?.enabled ?? true;
  
  const openFeature = (feature: string) => {
    setActiveFeature(feature);
    onOpen();
  };
  
  const handleCloseModal = () => {
    setActiveFeature(null);
    closeModal();
  };
  
  const renderFeatureContent = () => {
    switch (activeFeature) {
      case 'speedtest':
        return <SpeedTest onClose={handleCloseModal} />;
      case 'networktools':
        return <NetworkTools onClose={handleCloseModal} />;
      case 'bandwidth':
        return <BandwidthMonitor onClose={handleCloseModal} />;
      default:
        return null;
    }
  };
  
  const getModalTitle = () => {
    switch (activeFeature) {
      case 'speedtest':
        return 'Network Speed Test';
      case 'networktools':
        return 'Network Tools';
      case 'bandwidth':
        return 'Bandwidth Monitor';
      default:
        return 'ALS Features';
    }
  };
  
  return (
    <>
      <Card bg={bg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Advanced Looking Glass</Heading>
              <Text fontSize="sm" color="gray.500">
                Enhanced network testing and monitoring tools
              </Text>
            </VStack>
            <Badge colorScheme="blue" variant="subtle">
              ALS Features
            </Badge>
          </Flex>
        </CardHeader>
        <CardBody>
          <VStack spacing={6} align="stretch">
            {/* Feature Overview */}
            <Alert status="info" variant="left-accent">
              <AlertIcon />
              <AlertDescription>
                These advanced features provide comprehensive network testing capabilities 
                including speed tests, network diagnostics, and real-time bandwidth monitoring.
              </AlertDescription>
            </Alert>
            
            {/* Feature Grid */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              <FeatureCard
                title="Speed Test"
                description="Test download and upload speeds with customizable file sizes"
                icon={FiZap}
                colorScheme="blue"
                onClick={() => openFeature('speedtest')}
                disabled={!speedTestEnabled}
              />
              
              <FeatureCard
                title="Network Tools"
                description="Ping, traceroute, and iPerf3 server for network diagnostics"
                icon={FiWifi}
                colorScheme="green"
                onClick={() => openFeature('networktools')}
                disabled={!networkToolsEnabled}
              />
              
              <FeatureCard
                title="Bandwidth Monitor"
                description="Real-time network interface bandwidth monitoring and graphs"
                icon={FiActivity}
                colorScheme="purple"
                onClick={() => openFeature('bandwidth')}
                disabled={!bandwidthEnabled}
              />
            </SimpleGrid>
            
            {/* Quick Stats */}
            <Card variant="outline">
              <CardHeader>
                <Heading size="sm">Feature Status</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <HStack>
                    <Icon as={FiZap} color={speedTestEnabled ? "green.500" : "red.500"} />
                    <Text fontSize="sm">Speed Test</Text>
                    <Badge colorScheme={speedTestEnabled ? "green" : "red"} size="sm">
                      {speedTestEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </HStack>
                  
                  <HStack>
                    <Icon as={FiWifi} color={networkToolsEnabled ? "green.500" : "red.500"} />
                    <Text fontSize="sm">Network Tools</Text>
                    <Badge colorScheme={networkToolsEnabled ? "green" : "red"} size="sm">
                      {networkToolsEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </HStack>
                  
                  <HStack>
                    <Icon as={FiActivity} color={bandwidthEnabled ? "green.500" : "red.500"} />
                    <Text fontSize="sm">Bandwidth Monitor</Text>
                    <Badge colorScheme={bandwidthEnabled ? "green" : "red"} size="sm">
                      {bandwidthEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </HStack>
                </SimpleGrid>
              </CardBody>
            </Card>
          </VStack>
        </CardBody>
      </Card>
      
      {/* Feature Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={handleCloseModal} 
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>{getModalTitle()}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {renderFeatureContent()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
