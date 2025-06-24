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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { FiWifi, FiActivity, FiZap, FiArrowRight } from 'react-icons/fi';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';
import { ALSDashboard } from './als-dashboard';

interface ALSSummaryProps {
  onClose?: () => void;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  colorScheme: string;
  onClick: () => void;
  disabled?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({
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
    <Button
      variant="outline"
      h="auto"
      p={4}
      bg={bg}
      borderColor={borderColor}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.6 : 1}
      _hover={disabled ? {} : { bg: hoverBg, borderColor: `${colorScheme}.300` }}
      onClick={disabled ? undefined : onClick}
      justifyContent="flex-start"
      textAlign="left"
    >
      <HStack spacing={3} w="100%">
        <Icon as={icon} boxSize={5} color={`${colorScheme}.500`} />
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="semibold" fontSize="sm">
            {title}
          </Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {description}
          </Text>
        </VStack>
        <Icon as={FiArrowRight} boxSize={4} color="gray.400" />
      </HStack>
    </Button>
  );
};

export const ALSSummary: React.FC<ALSSummaryProps> = ({ onClose }) => {
  const config = useConfig();
  const { isOpen, onOpen, onClose: closeModal } = useDisclosure();
  
  const bg = useColorValue('white', 'gray.800');
  const borderColor = useColorValue('gray.200', 'gray.600');
  const statBg = useColorValue('gray.50', 'gray.900');
  
  // Check if ALS features are enabled in config
  const alsConfig = config.alsFeatures || {};
  const speedTestEnabled = alsConfig.speedtest?.enabled ?? true;
  const networkToolsEnabled = alsConfig.networkTools?.enabled ?? true;
  const bandwidthEnabled = alsConfig.bandwidth?.enabled ?? true;
  
  const enabledFeatures = [speedTestEnabled, networkToolsEnabled, bandwidthEnabled].filter(Boolean).length;
  
  const openFullDashboard = () => {
    onOpen();
  };
  
  const handleCloseModal = () => {
    closeModal();
  };
  
  return (
    <>
      <Card bg={bg} borderColor={borderColor} borderWidth="1px" size="sm">
        <CardHeader pb={2}>
          <Flex justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Heading size="md">Advanced Tools</Heading>
              <Text fontSize="sm" color="gray.500">
                Network testing & monitoring
              </Text>
            </VStack>
            <Badge colorScheme="blue" variant="subtle">
              {enabledFeatures}/3 Active
            </Badge>
          </Flex>
        </CardHeader>
        <CardBody pt={2}>
          <VStack spacing={4} align="stretch">
            {/* Quick Stats */}
            <SimpleGrid columns={3} spacing={2}>
              <Stat bg={statBg} p={3} borderRadius="md" textAlign="center">
                <StatLabel fontSize="xs">Speed Test</StatLabel>
                <StatNumber fontSize="sm" color={speedTestEnabled ? "green.500" : "red.500"}>
                  {speedTestEnabled ? "Ready" : "Off"}
                </StatNumber>
              </Stat>
              
              <Stat bg={statBg} p={3} borderRadius="md" textAlign="center">
                <StatLabel fontSize="xs">Net Tools</StatLabel>
                <StatNumber fontSize="sm" color={networkToolsEnabled ? "green.500" : "red.500"}>
                  {networkToolsEnabled ? "Ready" : "Off"}
                </StatNumber>
              </Stat>
              
              <Stat bg={statBg} p={3} borderRadius="md" textAlign="center">
                <StatLabel fontSize="xs">Bandwidth</StatLabel>
                <StatNumber fontSize="sm" color={bandwidthEnabled ? "green.500" : "red.500"}>
                  {bandwidthEnabled ? "Ready" : "Off"}
                </StatNumber>
              </Stat>
            </SimpleGrid>
            
            {/* Quick Actions */}
            <VStack spacing={2} align="stretch">
              <QuickAction
                title="Speed Test"
                description="Test download/upload speeds"
                icon={FiZap}
                colorScheme="blue"
                onClick={openFullDashboard}
                disabled={!speedTestEnabled}
              />
              
              <QuickAction
                title="Network Tools"
                description="Ping, traceroute, iPerf3"
                icon={FiWifi}
                colorScheme="green"
                onClick={openFullDashboard}
                disabled={!networkToolsEnabled}
              />
              
              <QuickAction
                title="Bandwidth Monitor"
                description="Real-time interface monitoring"
                icon={FiActivity}
                colorScheme="purple"
                onClick={openFullDashboard}
                disabled={!bandwidthEnabled}
              />
            </VStack>
            
            {/* View All Button */}
            <Button
              colorScheme="blue"
              variant="solid"
              size="sm"
              onClick={openFullDashboard}
              rightIcon={<Icon as={FiArrowRight} />}
            >
              Open Advanced Tools
            </Button>
          </VStack>
        </CardBody>
      </Card>
      
      {/* Full Dashboard Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={handleCloseModal} 
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>Advanced Looking Glass Tools</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <ALSDashboard onClose={handleCloseModal} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
