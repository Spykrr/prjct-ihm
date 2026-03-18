import { Box, Tooltip, Text } from '@chakra-ui/react';

interface InfoTooltipIconProps {
  message: string;
  showTooltip?: boolean;
  iconSize?: number;
  /**
   * Couleur CSS Chakra (ex: "gray.400" ou "#422AFB")
   * Utilisée uniquement quand l'info est affichée.
   */
  color?: string;
}

export default function InfoTooltipIcon({
  message,
  showTooltip = true,
  iconSize = 14,
  color = 'gray.400',
}: InfoTooltipIconProps) {
  const trimmed = (message ?? '').trim();
  if (!showTooltip || !trimmed) return null;

  return (
    <Tooltip.Root openDelay={150} closeDelay={50}>
      <Tooltip.Trigger asChild>
        <Box
          as="span"
          cursor="help"
          lineHeight={0}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={`${Math.max(18, iconSize + 6)}px`}
          h={`${Math.max(18, iconSize + 6)}px`}
          borderRadius="full"
          bg="gray.100"
          borderWidth="1px"
          borderColor="gray.200"
          color={color}
        >
          <Text
            fontSize="xs"
            fontWeight="bold"
            lineHeight="1"
            transform="translateY(-0.5px)"
            userSelect="none"
          >
            i
          </Text>
        </Box>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content
          maxW="360px"
          fontSize="sm"
          lineHeight="1.35"
          bg="gray.900"
          color="white"
          px={3}
          py={2}
          borderRadius="md"
          boxShadow="lg"
        >
          <Tooltip.Arrow bg="gray.900" />
          {trimmed}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

