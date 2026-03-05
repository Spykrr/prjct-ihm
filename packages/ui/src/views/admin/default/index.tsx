import { Box, Card, Text } from '@chakra-ui/react';
import { useSidebar } from '../../../contexts/SidebarContext';
import TestsFile from '../gestionTest/TestsFile';
import RefTestFile from '../ordananceTest/RefTestFile';
import VariablesFile from '../variables/VariablesFile';

export default function DefaultView() {
  const { activeTab } = useSidebar();

  const renderContent = () => {
    switch (activeTab) {
      case '1':
        return <TestsFile />;
      case '2':
        return <RefTestFile />;
      case '3':
        return <TestsFile />;
      case '4':
        return <VariablesFile />;
      default:
        return <NotSelectedCard />;
    }
  };

  return <Box>{renderContent()}</Box>;
}

function NotSelectedCard() {
  return (
    <Card.Root maxW="md">
      <Card.Body>
        <Text>Sélectionnez un élément dans l'arbre</Text>
      </Card.Body>
    </Card.Root>
  );
}
