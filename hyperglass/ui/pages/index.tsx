import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { If, Then, Else } from 'react-if';
import {
  VStack,
  Box,
  Divider,
  Grid,
  GridItem,
  Container,
  Heading,
  Text,
  useBreakpointValue,
  Flex,
  Spacer
} from '@chakra-ui/react';
import { Loading } from '~/elements';
import { useView } from '~/hooks';
import { useConfig } from '~/context';
import { useColorValue } from '~/hooks';

import type { NextPage } from 'next';

const LookingGlassForm = dynamic<Dict>(
  () => import('~/components/looking-glass-form').then(i => i.LookingGlassForm),
  {
    loading: Loading,
  },
);

const Results = dynamic<Dict>(() => import('~/components/results').then(i => i.Results), {
  loading: Loading,
});

const ALSSummary = dynamic<Dict>(() => import('~/components/als-features').then(i => i.ALSSummary), {
  loading: Loading,
});

const Index: NextPage = () => {
  const view = useView();
  const config = useConfig();

  // Check if ALS features are enabled
  const alsEnabled = config.alsFeatures?.enabled ?? true;

  // Responsive layout
  const gridColumns = useBreakpointValue({ base: 1, xl: alsEnabled ? 2 : 1 });
  const containerMaxW = useBreakpointValue({ base: '100%', lg: '90%', xl: '95%' });

  const sectionBg = useColorValue('gray.50', 'gray.900');
  const borderColor = useColorValue('gray.200', 'gray.700');

  return (
    <If condition={view === 'results'}>
      <Then>
        <Results />
      </Then>
      <Else>
        <Container maxW={containerMaxW} px={4}>
          <If condition={alsEnabled && gridColumns === 2}>
            <Then>
              {/* Two-column layout for larger screens */}
              <Grid templateColumns="1fr 1fr" gap={8} alignItems="start">
                <GridItem>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="lg" mb={2} textAlign="center">
                        Network Looking Glass
                      </Heading>
                      <Text fontSize="md" color="gray.500" textAlign="center" mb={6}>
                        Query network devices and analyze routing information
                      </Text>
                    </Box>
                    <AnimatePresence>
                      <LookingGlassForm />
                    </AnimatePresence>
                  </VStack>
                </GridItem>

                <GridItem>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="lg" mb={2} textAlign="center">
                        Advanced Tools
                      </Heading>
                      <Text fontSize="md" color="gray.500" textAlign="center" mb={6}>
                        Network testing and monitoring capabilities
                      </Text>
                    </Box>
                    <ALSSummary />
                  </VStack>
                </GridItem>
              </Grid>
            </Then>
            <Else>
              {/* Single-column layout for smaller screens or when ALS is disabled */}
              <VStack spacing={8} align="stretch" w="100%">
                <AnimatePresence>
                  <LookingGlassForm />
                </AnimatePresence>

                {alsEnabled && (
                  <>
                    <Flex align="center" my={4}>
                      <Divider />
                      <Text px={4} fontSize="sm" color="gray.500" whiteSpace="nowrap">
                        Advanced Features
                      </Text>
                      <Divider />
                    </Flex>
                    <ALSSummary />
                  </>
                )}
              </VStack>
            </Else>
          </If>
        </Container>
      </Else>
    </If>
  );
};

export default Index;
